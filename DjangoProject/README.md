# NZ Bird Sound Backend AWS

Django REST backend for the NZ Bird Sound project. This repository is the AWS deployment copy for the backend only.

## Main Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/birds/api/healthz/` | ALB health check |
| GET | `/birds/api/birds/` | List birds |
| GET | `/birds/api/birds/{eBird}/` | Get one bird |
| GET | `/birds/api/search-by-description/?query=...` | Semantic bird search |
| POST | `/birds/api/classify/?ext=wav` | Classify raw audio bytes |
| GET | `/birds/api/audio/{eBird}/{filename}/` | Serve audio from EFS |
| GET | `/birds/api/image/{eBird}/{index}/` | Serve images from EFS |

## AWS Shape

- ECR stores the Docker image.
- ECS Fargate runs the Django container.
- ALB routes public traffic and checks `/birds/api/healthz/`.
- RDS PostgreSQL stores app data.
- EFS stores seed data, audio, images, classifier artifacts, and search assets.
- Secrets Manager stores production secrets.
- CloudWatch receives container logs.

## Required EFS Mount

| Container path | Purpose |
| --- | --- |
| `/mnt/artifacts` | EFS root mounted into the container |

Expected EFS subfolders:

| EFS path inside container | Purpose |
| --- | --- |
| `/mnt/artifacts/seed` | MaterialsPrep CSVs, audio, and images |
| `/mnt/artifacts/BirdClassify` | Classifier model artifacts |
| `/mnt/artifacts/birdTextTraining` | Semantic search assets |

## Required Environment

See `.env.example` for the ECS environment variables and Secrets Manager values this app expects.

## Deployment Notes

The container starts through `entrypoint.sh`, which waits for RDS, applies committed migrations, seeds data if empty, collects static files, and starts Gunicorn.
