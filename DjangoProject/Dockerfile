FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Build native deps for Python audio, ML, and PostgreSQL packages.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        libsndfile1 \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY requirements.txt .
RUN pip install --prefix=/install -r requirements.txt


FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_ENV=production \
    PORT=8000

RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        libsndfile1 \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Run as non-root in ECS.
RUN useradd --create-home --uid 1000 app

COPY --from=builder /install /usr/local

WORKDIR /app
COPY --chown=app:app . /app
RUN mkdir -p /app/staticfiles && chown -R app:app /app

USER app

EXPOSE 8000

ENTRYPOINT ["sh", "/app/entrypoint.sh"]
