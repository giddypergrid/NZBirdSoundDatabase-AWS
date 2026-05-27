"""
Seed Postgres with the bird reference data shipped in MaterialsPrep/.

Reads three CSVs:
  - bird_naming_map.csv   ->Bird (eBird PK, common/scientific/extra names)
  - bird_descriptions.csv ->updates Bird with text description fields
  - bird_audio.csv        ->BirdSound (one row per training clip)

Replaces the old MySQL-only `import_db.py` (LOAD DATA LOCAL INFILE).
Pure Django ORM, so it works against any backend Django supports.

Usage (inside container or local):
  python manage.py import_seed_data                    # skip if already populated
  python manage.py import_seed_data --if-empty         # same, explicit
  python manage.py import_seed_data --clear            # wipe + reload
  python manage.py import_seed_data --csv-dir /seed    # override CSV location
"""

import csv
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from Bird_Sound.models import Bird, BirdSound

BATCH_SIZE = 5000


class Command(BaseCommand):
    help = "Import bird reference CSVs into Postgres (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--csv-dir",
            default=None,
            help="Folder containing the seed CSVs. Defaults to MaterialsPrep "
                 "alongside the repo, or /seed from the EFS mount.",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Truncate tables before importing (destructive).",
        )
        parser.add_argument(
            "--if-empty",
            action="store_true",
            help="Skip silently if tables already contain rows (safe for entrypoint).",
        )

    def _resolve_csv_dir(self, override: str | None) -> Path:
        if override:
            p = Path(override)
        elif Path("/seed").is_dir():
            # AWS: EFS mounts MaterialsPrep at /seed.
            p = Path("/seed")
        else:
            # Bare host: find ../MaterialsPrep relative to repo root.
            p = Path(settings.BASE_DIR).parent / "MaterialsPrep"
        if not p.is_dir():
            raise CommandError(f"CSV directory not found: {p}")
        return p

    def _load_naming_map(self, path: Path) -> int:
        """bird_naming_map.csv: CommonName,eBird,ScientificName,ExtraName"""
        rows = []
        with path.open("r", encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                rows.append(Bird(
                    eBird=row["eBird"],
                    common_name=row["CommonName"],
                    scientific_name=row["ScientificName"],
                    extra_name=row.get("ExtraName") or None,
                ))
        Bird.objects.bulk_create(rows, batch_size=BATCH_SIZE, ignore_conflicts=True)
        return len(rows)

    def _load_descriptions(self, path: Path) -> tuple[int, int]:
        """bird_descriptions.csv: eBird,description,sound_description,naughty_description"""
        if not path.is_file():
            return (0, 0)
        existing = {b.eBird: b for b in Bird.objects.all()}
        updated, missing = 0, 0
        to_update: list[Bird] = []
        with path.open("r", encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                bird = existing.get(row["eBird"])
                if not bird:
                    missing += 1
                    continue
                bird.description = row.get("description") or None
                bird.sound_description = row.get("sound_description") or None
                bird.naughty_description = row.get("naughty_description") or None
                to_update.append(bird)
                updated += 1
        if to_update:
            Bird.objects.bulk_update(
                to_update,
                ["description", "sound_description", "naughty_description"],
                batch_size=BATCH_SIZE,
            )
        return (updated, missing)

    def _load_bird_audio(self, path: Path) -> int:
        """bird_audio.csv columns: <unnamed-index>,filename,eBird,secondary_labels,station,recording_mode,file_type,recording_datetime"""
        import json

        rows = []
        total = 0
        with path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # secondary_labels is a JSON-encoded string in the CSV.
                raw = row.get("secondary_labels") or "[]"
                try:
                    sec = json.loads(raw) if raw.strip() else []
                except json.JSONDecodeError:
                    sec = []
                rows.append(BirdSound(
                    filename=row["filename"],
                    eBird=row["eBird"],
                    secondary_labels=sec,
                    station=row.get("station") or None,
                    recording_mode=row.get("recording_mode") or None,
                    file_type=row.get("file_type") or None,
                    recording_datetime=(row.get("recording_datetime") or None) or None,
                ))
                if len(rows) >= BATCH_SIZE:
                    BirdSound.objects.bulk_create(rows, batch_size=BATCH_SIZE)
                    total += len(rows)
                    self.stdout.write(f"      {total:,} rows...", ending="\r")
                    rows = []
        if rows:
            BirdSound.objects.bulk_create(rows, batch_size=BATCH_SIZE)
            total += len(rows)
        return total

    def handle(self, *args, **opts):
        csv_dir = self._resolve_csv_dir(opts["csv_dir"])
        self.stdout.write(self.style.NOTICE(f"Seed source: {csv_dir}"))

        already_seeded = Bird.objects.exists() or BirdSound.objects.exists()

        if already_seeded and opts["if_empty"]:
            self.stdout.write(self.style.WARNING(
                "Tables already populated; --if-empty given, skipping."))
            return

        if opts["clear"]:
            self.stdout.write("Clearing existing rows...")
            BirdSound.objects.all().delete()
            Bird.objects.all().delete()
        elif already_seeded:
            raise CommandError(
                "Tables already contain data. Use --clear to wipe, or "
                "--if-empty to skip silently."
            )

        with transaction.atomic():
            self.stdout.write("[1/3] bird_naming_map.csv ...")
            n = self._load_naming_map(csv_dir / "bird_naming_map.csv")
            self.stdout.write(f"      {n:,} bird species inserted.")

            self.stdout.write("[2/3] bird_descriptions.csv ...")
            updated, missing = self._load_descriptions(csv_dir / "bird_descriptions.csv")
            self.stdout.write(
                f"      {updated:,} descriptions merged"
                + (f" ({missing} CSV rows had no matching eBird)" if missing else "")
            )

            self.stdout.write("[3/3] bird_audio.csv ...")
            n = self._load_bird_audio(csv_dir / "bird_audio.csv")
            self.stdout.write(f"      {n:,} audio rows inserted.       ")

        self.stdout.write(self.style.SUCCESS("Seed import complete."))
