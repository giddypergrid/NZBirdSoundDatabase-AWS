from __future__ import annotations

import importlib
import os
import sys
from pathlib import Path
from types import ModuleType


def _env_path(name: str, default: Path) -> Path:
    """Return Path from env var if set, else the default. Lets Docker override
    sibling-folder locations that don't exist inside the container."""
    v = os.environ.get(name)
    return Path(v) if v else default


class KeyFiles:
    def __init__(self) -> None:
        here = Path(__file__).resolve()
        self.bird_sound_app: Path = here.parent
        self.django_project: Path = here.parents[1]
        self.repo_root: Path = here.parents[2]

        # Sibling folders. In local dev these live next to DjangoProject/; in
        # Docker they are bind-mounted elsewhere, so allow env overrides.
        self.bird_text_training: Path = _env_path("BIRD_TEXT_TRAINING_DIR", self.repo_root / "birdTextTraining")
        self.bird_classify: Path = _env_path("BIRD_CLASSIFY_DIR", self.repo_root / "BirdClassify")
        self.bird_sound_training: Path = _env_path("BIRD_SOUND_TRAINING_DIR", self.repo_root / "BirdSoundTraining")
        self.materials_prep: Path = _env_path("MATERIALS_PREP_DIR", self.repo_root / "MaterialsPrep")

        self.audio_files_root: Path = self.materials_prep / "train_audio"
        self.image_files_root: Path = self.materials_prep / "bird_pic"

        self.classifier_model_path: Path = self.bird_classify / "trained_model"
        self.classifier_artifacts_path: Path = self.classifier_model_path / "artifacts"

        self.embeddings_dir: Path = self.bird_text_training / "embeddings"

        self.bird_descriptions_csv: Path = self.materials_prep / "bird_descriptions.csv"
        self.bird_descriptions_plain_csv: Path = self.materials_prep / "bird_descriptions_plain.csv"
        self.bird_naming_map_csv: Path = self.materials_prep / "bird_naming_map.csv"

        self._sys_path_added: set[str] = set()

    def _ensure_on_sys_path(self, folder: Path) -> None:
        folder_str = str(folder)
        if folder_str in self._sys_path_added:
            return
        if folder_str not in sys.path:
            sys.path.insert(0, folder_str)
        self._sys_path_added.add(folder_str)

    def _import(self, folder: Path, module_name: str) -> ModuleType:
        if not folder.is_dir():
            raise FileNotFoundError(f"Expected folder not found: {folder}")
        self._ensure_on_sys_path(folder)
        return importlib.import_module(module_name)

    def search_mod(self) -> ModuleType:
        return self._import(self.bird_text_training, "search")

    def precompute_embeddings_mod(self) -> ModuleType:
        return self._import(self.bird_text_training, "precompute_embeddings")


key_files = KeyFiles()
