import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env next to manage.py. OS env vars win (Docker/CI overrides).
load_dotenv(BASE_DIR / ".env", override=False)


def env(key: str, default=None, *, required: bool = False):
    """Read an env var, stripping surrounding whitespace."""
    val = os.environ.get(key)
    if val is None or val == "":
        if required:
            raise RuntimeError(f"Missing required environment variable: {key}")
        return default
    return val.strip()


def env_bool(key: str, default: bool = False) -> bool:
    val = env(key)
    if val is None:
        return default
    return val.lower() in ("1", "true", "yes", "on")


def env_list(key: str, default=None) -> list[str]:
    val = env(key)
    if not val:
        return list(default or [])
    return [item.strip() for item in val.split(",") if item.strip()]


def env_path_limits(key: str, default=None) -> tuple[tuple[str, int], ...]:
    raw_items = env_list(key, default=default)
    limits = []
    for item in raw_items:
        path, limit = item.rsplit("=", 1)
        limits.append((path.strip(), int(limit)))
    return tuple(limits)


DJANGO_ENV = (env("DJANGO_ENV", default="production") or "production").lower()
if DJANGO_ENV not in ("development", "production"):
    raise RuntimeError(
        f"DJANGO_ENV must be 'development' or 'production', got {DJANGO_ENV!r}"
    )
IS_DEV = DJANGO_ENV == "development"

DEBUG = IS_DEV

# SECRET_KEY: required in prod; insecure dev fallback only in DEBUG.
SECRET_KEY = env(
    "DJANGO_SECRET_KEY",
    default=("django-insecure-dev-only-DO-NOT-USE-IN-PROD" if DEBUG else None),
    required=not DEBUG,
)

ALLOWED_HOSTS = env_list(
    "DJANGO_ALLOWED_HOSTS",
    default=["localhost", "127.0.0.1"] if DEBUG else [],
)
# In dev, allow Dockerized local checks to reach the host dev server.
if IS_DEV and "host.docker.internal" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append("host.docker.internal")

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'drf_spectacular',
    'Bird_Sound',
]

MIDDLEWARE = [
    # RequestIDMiddleware sits as early as possible so every downstream log
    # line -including DB errors and security middleware rejections -is
    # tagged with the same request_id.
    'Bird_Sound.middleware.RequestIDMiddleware',
    'Bird_Sound.middleware.TrafficGuardMiddleware',
    'django.middleware.security.SecurityMiddleware',
    # WhiteNoise serves /static/ in prod (admin CSS, drf-spectacular UI).
    # Must be directly after SecurityMiddleware. No-op when DEBUG=True.
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'DjangoProject.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'DjangoProject.wsgi.application'

# Creds come from ECS environment variables and Secrets Manager. In AWS, DB_HOST is the RDS endpoint.
DATABASES = {
    'default': {
        'ENGINE':   'django.db.backends.postgresql',
        'NAME':     env('DB_NAME',     default='birdsound', required=not DEBUG),
        'USER':     env('DB_USER',     default='bird',      required=not DEBUG),
        'PASSWORD': env('DB_PASSWORD', default='bird',      required=not DEBUG),
        'HOST':     env('DB_HOST',     default='localhost'),
        'PORT':     env('DB_PORT',     default='5432'),
        # Persistent connections -saves ~5ms per request. 0 disables.
        'CONN_MAX_AGE': int(env('DB_CONN_MAX_AGE', default='60')),
        # CONN_HEALTH_CHECKS pings stale conns once per request before reuse.
        # Cheap insurance against "server closed the connection unexpectedly".
        'CONN_HEALTH_CHECKS': True,
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
# collectstatic writes here at container build/boot. WhiteNoise serves it.
STATIC_ROOT = BASE_DIR / "staticfiles"
# Compressed + hashed filenames (long-term caching). Falls back to plain
# files in dev if collectstatic hasn't run.
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"} if not DEBUG
                    else {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Dev:  pretty single-line console output for humans.
# Prod: structured JSON to stdout -one JSON object per line.
#       ECS sends container stdout to CloudWatch Logs.
# Every record gets a `request_id` field via RequestIDFilter.
LOG_FORMAT = (env("LOG_FORMAT", default="json" if not IS_DEV else "console") or "console").lower()
LOG_LEVEL = (env("LOG_LEVEL", default="INFO") or "INFO").upper()

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "request_id": {
            "()": "Bird_Sound.middleware.RequestIDFilter",
        },
    },
    "formatters": {
        "console": {
            "format": "{levelname:<7} {asctime} [{request_id}] {name}: {message}",
            "style": "{",
        },
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            # Keys in the JSON output. `%(...)` are stdlib LogRecord attrs.
            # `request_id` comes from the filter; extras passed via
            # logger.info("...", extra={...}) are merged automatically.
            "format": "%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s",
            "rename_fields": {
                "asctime": "timestamp",
                "levelname": "level",
                "name": "logger",
                "message": "msg",
            },
            "datefmt": "%Y-%m-%dT%H:%M:%S%z",
        },
    },
    "handlers": {
        "stdout": {
            "class": "logging.StreamHandler",
            "filters": ["request_id"],
            "formatter": LOG_FORMAT,
        },
    },
    "root": {
        "handlers": ["stdout"],
        "level": LOG_LEVEL,
    },
    "loggers": {
        # Django's runserver request log spam -keep at INFO so you see
        # 4xx/5xx, but suppress the chatty 200/304 lines if desired.
        "django.server": {"level": "INFO", "propagate": True},
        # Quieten noisy third-party libs in dev.
        "urllib3": {"level": "WARNING", "propagate": True},
        "PIL": {"level": "WARNING", "propagate": True},
    },
}

# Dev: allow all (arbitrary Vite ports). Prod: whitelist via env.
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = env_list('CORS_ALLOWED_ORIGINS', default=[])

# Prod only. Assumes TLS-terminating proxy sets X-Forwarded-Proto.
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    # ALB owns HTTPS enforcement. Django should trust forwarded proto.
    SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", default=False)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(env("DJANGO_HSTS_SECONDS", default=str(60 * 60 * 24 * 30)))  # 30 days
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = env_bool("DJANGO_HSTS_PRELOAD", default=False)
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"
    X_FRAME_OPTIONS = "DENY"

# /classify/ POSTs raw audio bytes (no multipart). Django's
# DATA_UPLOAD_MAX_MEMORY_SIZE is the hard cap on request.body.
DATA_UPLOAD_MAX_MEMORY_SIZE = int(env("DATA_UPLOAD_MAX_MEMORY_SIZE", default=str(5 * 1024 * 1024)))
MAX_CLASSIFY_AUDIO_BYTES    = int(env("MAX_CLASSIFY_AUDIO_BYTES",    default=str(5 * 1024 * 1024)))

# Process-local back-pressure. This protects one ECS task; DRF throttles still
# handle caller-level limits.
MIN_FREE_MEMORY_BYTES = int(env("MIN_FREE_MEMORY_BYTES", default=str(256 * 1024 * 1024)))
TRAFFIC_GUARD_ENABLED = env_bool("TRAFFIC_GUARD_ENABLED", default=not DEBUG)
MAX_IN_FLIGHT_REQUESTS = int(env("MAX_IN_FLIGHT_REQUESTS", default="30"))
TRAFFIC_GUARD_RETRY_AFTER_SECONDS = int(env("TRAFFIC_GUARD_RETRY_AFTER_SECONDS", default="5"))
TRAFFIC_GUARD_PATH_LIMITS = env_path_limits(
    "TRAFFIC_GUARD_PATH_LIMITS",
    default=["/birds/api/classify/=1", "/birds/api/search-by-description/=2"],
)
TRAFFIC_GUARD_BYPASS_PATHS = tuple(env_list(
    "TRAFFIC_GUARD_BYPASS_PATHS",
    default=["/birds/api/healthz/"],
))

# Warm heavy singletons at worker startup, before the first real request.
PRELOAD_SEMANTIC_SEARCH = env_bool("PRELOAD_SEMANTIC_SEARCH", default=not DEBUG)
PRELOAD_CLASSIFIER = env_bool("PRELOAD_CLASSIFIER", default=not DEBUG)

# Scoped throttles: set throttle_scope='classify'/'search' on hot views.
# Throttles use the default cache (LocMem). Swap to Redis in prod.
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': env('THROTTLE_ANON', default='120/min'),
        'classify': env('THROTTLE_CLASSIFY', default='5/min'),
        'search': env('THROTTLE_SEARCH', default='30/min'),
    },
}

# DRF Spectacular Configuration
SPECTACULAR_SETTINGS = {
    'TITLE': 'Bird Sound API',
    'DESCRIPTION': 'API for bird sound data',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# Cross-folder paths: single source of truth in Bird_Sound.key_files,
# re-exported on settings.* for views that read from Django config.
from Bird_Sound.key_files import key_files  # noqa: E402

AUDIO_FILES_ROOT = key_files.audio_files_root
IMAGE_FILES_ROOT = key_files.image_files_root
CLASSIFIER_MODEL_PATH = key_files.classifier_model_path
CLASSIFIER_ARTIFACTS_PATH = key_files.classifier_artifacts_path
