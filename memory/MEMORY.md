# DjangoAWS Memory

## Folder Purpose
- `C:\Users\PC\Desktop\Github\DjangoAWS` is the clean AWS deployment lab copy.
- Use this folder for AWS/cloud deployment work going forward.
- Do not let the older `Django` folder pollute decisions unless explicitly comparing source history.

## Deployment Goal
Build a real, interview-safe AWS deployment path for the NZ Bird Sound Django backend.

Target claim:
> Built and documented an AWS deployment path for a Django backend using ECR, ECS Fargate, ALB health checks, RDS PostgreSQL, EFS-mounted ML/data artifacts, Secrets Manager, CloudWatch logs, IAM roles, security groups, and cost-safe teardown.

Do not overclaim:
- Do not say AWS expert.
- Do not say production AWS migration unless the live public site actually moves to AWS.
- Do not say high availability, multi-region, Kubernetes, or advanced DevOps.

## Architecture Decisions
- Use AWS for learning/deployment proof, not necessarily as the permanent live host.
- Keep the current live project link on the existing server unless later decided otherwise.
- Use only AWS-native monitoring for this lab.
- Do not set up Sentry or Grafana/Alloy in this AWS lab.
- Keep only the ALB target group health check as the important AWS health gate.
- Remove or ignore extra container-level health checks if they create duplicate behavior.

## Target AWS Components
- ECR: stores the Docker image after it is built locally or by CI.
- ECS Fargate: runs the Django container without managing a server.
- ALB: public reverse proxy and health checker.
- Target group: sends `GET /birds/api/healthz/` to ECS tasks.
- RDS PostgreSQL: managed database.
- EFS: shared file storage for project artifacts that were local bind mounts before.
- Secrets Manager: stores `DJANGO_SECRET_KEY`, DB password, and other sensitive config.
- CloudWatch: stores ECS/container logs and basic AWS metrics.
- IAM roles: allow ECS to pull images, read secrets, mount EFS, and write logs.
- Security groups: firewall rules between ALB, ECS, RDS, and EFS.

## Mental Model
- Docker build is the factory.
- ECR is the warehouse shelf.
- ECS Fargate opens and runs the package.
- ALB is the public front door and reverse proxy.
- Target group health checks decide whether traffic reaches the container.
- RDS is the managed database.
- EFS is the cloud version of mounted project folders.
- CloudWatch is AWS-side CCTV/logging.

## Current Project Shape
Expected active backend folder:
- `DjangoProject/`

Expected important files:
- `DjangoProject/Dockerfile`
- `DjangoProject/docker-compose.yml`
- `DjangoProject/.dockerignore`
- `DjangoProject/entrypoint.sh`
- `DjangoProject/requirements.txt`
- `DjangoProject/.env.example`

Existing VPS/Compose used mounted folders:
- `../MaterialsPrep` -> `/seed`
- `../BirdClassify` -> `/opt/BirdClassify`
- `../birdTextTraining` -> `/opt/birdTextTraining`

AWS plan:
- Replace those local bind mounts with EFS mounts.
- Keep env paths:
  - `MATERIALS_PREP_DIR=/seed`
  - `BIRD_CLASSIFY_DIR=/opt/BirdClassify`
  - `BIRD_TEXT_TRAINING_DIR=/opt/birdTextTraining`

## Secrets Injection
Secrets Manager values are injected by ECS when a task starts.

Flow:
1. ECS starts task.
2. ECS reads allowed secrets from Secrets Manager using the task execution/task role.
3. ECS exposes those values as environment variables inside the container.
4. `entrypoint.sh` starts.
5. Django `settings.py` reads the environment variables.

## Health Checks
Use ALB target group health check as the main AWS health check:
- Path: `/birds/api/healthz/`
- Success code: `200`

Gunicorn is not a health check. It is the Python web server process.
If Gunicorn dies, the container should exit and ECS will replace the task.

## Cost Control
Use AWS credits for the lab, but still set up cost safety:
- Create AWS Budget alert before deploying.
- Avoid NAT Gateway unless absolutely needed.
- Run for hours or one day, capture screenshots, document, then tear down.
- Check billing the next day for leftover resources.

Common surprise-cost resources:
- NAT Gateway
- RDS left running
- ALB left running
- EFS data/mount targets left running
- unattached EBS volumes
- public IPv4 addresses

## Learning Scope
This lab should cover the important basics:
- Docker image build
- ECR push
- ECS Fargate task/service
- ALB routing
- ALB health checks
- RDS connection
- EFS mount
- Secrets Manager config
- CloudWatch logs
- IAM permissions
- security groups
- teardown

Skip for now:
- Kubernetes/EKS
- Terraform
- multi-region
- complex autoscaling
- CDN/WAF
- Sentry/Grafana setup on AWS

## Next Steps
1. Confirm Docker Desktop is installed and `docker --version` works.
2. Confirm AWS CLI is installed and `aws --version` works.
3. Configure AWS CLI for `ap-southeast-2`.
4. Verify login with `aws sts get-caller-identity`.
5. Confirm AWS credits are active in Billing and Cost Management -> Credits.
6. Keep budget alerts active before creating paid resources.
7. Build image locally from `DjangoProject/Dockerfile`.
8. Push image to ECR.
9. Create EFS and upload/mount artifact folders.
10. Create RDS PostgreSQL.
11. Create ECS task definition with EFS mounts, Secrets Manager env injection, and CloudWatch logs.
12. Create ECS Fargate service behind ALB.
13. Test `GET /birds/api/healthz/`, capture screenshots, document, teardown.
