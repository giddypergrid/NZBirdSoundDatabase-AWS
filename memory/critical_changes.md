# Critical Changes

## AWS-Only Repo Cleanup
- Old `.git/` history inside `DjangoProject/` was deleted because this is a brand-new AWS lab copy.
- Removed local/VPS-only runtime files and folders:
  - `docker-compose.yml`
  - `.env`
  - `Caddyfile`
  - `monitoring/`
  - `staticfiles/`
  - `db.sqlite3`
  - `.tmp.driveupload/`
  - Python `__pycache__/` folders
- `.env.example` was recreated as an AWS-oriented template for ECS/Secrets Manager/RDS/EFS variables.
- Keep `.env.example`; it documents required ECS environment and secret values.
- Keep `.gitattributes`; useful to force Linux line endings for shell scripts when working from Windows.

## Removed Non-AWS Observability/Proxy Pieces
- Removed Sentry setup from `DjangoProject/settings.py`.
- Removed `sentry-sdk[django]` from `requirements.txt`.
- Removed Prometheus/Grafana path:
  - Removed `django_prometheus` app and middleware.
  - Removed metrics route from `DjangoProject/urls.py`.
  - Removed `django-prometheus` from `requirements.txt`.
- Removed Dockerfile container `HEALTHCHECK` and `curl`; ALB target group health check is the AWS health gate.
- Keep Django `HealthCheckView` and `/birds/api/healthz/` because ALB still needs an app endpoint to call.

## Entrypoint Migration Policy
- `entrypoint.sh` now runs AWS-style startup:
  - wait for RDS
  - run `python manage.py migrate --noinput`
  - seed data if empty
  - collect static files
  - start Gunicorn
- Removed runtime `makemigrations`.
- Migration rule clarified:
  - local/dev creates migration files with `makemigrations`
  - Git/Docker image carries committed migration files
  - AWS/ECS only runs `migrate`
- Reason: RDS persists migration history across deploys; generated-in-container migration files disappear and can pollute/contradict DB history.

## Validation
- `python manage.py check` passed with temporary local env vars.
- Last scan only found expected health endpoint references.
