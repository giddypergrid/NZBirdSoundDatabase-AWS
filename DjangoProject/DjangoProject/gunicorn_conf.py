import logging

logger = logging.getLogger(__name__)


def post_worker_init(worker):
    from Bird_Sound.warmup import warm_runtime_models

    logger.info("Warming runtime models in gunicorn worker %s", worker.pid)
    warm_runtime_models()
