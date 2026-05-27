# Key Steps

## AWS Lab Direction
- Use `C:\Users\PC\Desktop\Github\DjangoAWS\DjangoProject` as an AWS-only Django backend deployment lab.
- Target region: `ap-southeast-2` (Asia Pacific Sydney).
- Do not use the AWS Console `Create application` widget for deployment; it is resource grouping, not ECS deployment.
- Create AWS Budgets before resources:
  - Zero spend alert.
  - `$100` monthly/credit tracking budget.
- Confirm credits in Billing and Cost Management -> Credits before running paid resources.

## Runtime Architecture
- `Dockerfile` builds the Django image for ECR.
- ECR stores the image.
- ECS on AWS Fargate starts the container from the ECR image.
- The ECS task container runs `/app/entrypoint.sh` through the Dockerfile `ENTRYPOINT`.
- RDS means Amazon Relational Database Service; this project uses Amazon RDS for PostgreSQL.
- ALB target group should health-check `GET /birds/api/healthz/`.
- CloudWatch receives ECS/container stdout logs.

## Data And Artifacts
- Do not move large external folders into the app repo or Docker image.
- Use EFS for large/shared artifacts and mount them into the ECS task:
  - `/seed` for MaterialsPrep CSV/audio/image data.
  - `/opt/BirdClassify` for classifier artifacts.
  - `/opt/birdTextTraining` for embeddings/search assets.
- Django paths stay env-driven:
  - `MATERIALS_PREP_DIR=/seed`
  - `BIRD_CLASSIFY_DIR=/opt/BirdClassify`
  - `BIRD_TEXT_TRAINING_DIR=/opt/birdTextTraining`

## Tool Readiness
- WSL2 Ubuntu is installed.
- Docker and AWS CLI were not yet available in PowerShell PATH during last check.
- Next local checks after install/restart:
  - `docker --version`
  - `aws --version`
  - `aws sts get-caller-identity`
