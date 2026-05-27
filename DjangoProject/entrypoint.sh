#!/bin/sh
set -e

echo "[entrypoint] Waiting for database at ${DB_HOST}:${DB_PORT}..."
python -c "
import os, socket, time, sys
host, port = os.environ['DB_HOST'], int(os.environ['DB_PORT'])
for i in range(60):
    try:
        with socket.create_connection((host, port), timeout=2):
            print(f'[entrypoint] DB reachable after {i}s')
            sys.exit(0)
    except OSError:
        time.sleep(1)
print('[entrypoint] DB never came up')
sys.exit(1)
"

echo "[entrypoint] Applying migrations..."
python manage.py migrate --noinput

echo "[entrypoint] Seeding reference data (skips if already populated)..."
python manage.py import_seed_data --if-empty

echo "[entrypoint] Collecting static files..."
python manage.py collectstatic --noinput

echo "[entrypoint] Starting gunicorn on 0.0.0.0:${PORT:-8000}"
exec gunicorn DjangoProject.wsgi:application \
    --bind "0.0.0.0:${PORT:-8000}" \
    --workers "${GUNICORN_WORKERS:-3}" \
    --threads "${GUNICORN_THREADS:-2}" \
    --timeout "${GUNICORN_TIMEOUT:-30}" \
    --access-logfile - \
    --error-logfile -
