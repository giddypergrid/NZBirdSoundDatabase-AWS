import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def warm_runtime_models() -> None:
    if settings.PRELOAD_SEMANTIC_SEARCH:
        _warm_semantic_search()
    if settings.PRELOAD_CLASSIFIER:
        _warm_classifier()


def _warm_semantic_search() -> None:
    try:
        from .semantic_search import get_semantic_search

        get_semantic_search()
    except Exception:
        logger.exception("Semantic search warmup failed")
        raise


def _warm_classifier() -> None:
    try:
        from .classifier import get_classifier

        get_classifier()
    except Exception:
        logger.exception("Classifier warmup failed")
        raise
