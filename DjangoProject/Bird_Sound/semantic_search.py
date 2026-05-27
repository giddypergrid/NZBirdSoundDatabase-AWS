"""Singleton wrapper around birdTextTraining.search.BirdSemanticSearch.
SentenceTransformer (~420 MB) + embedding matrices load once on first call."""
import logging

from .key_files import key_files

logger = logging.getLogger(__name__)

_searcher_instance = None


def get_semantic_search():
    """Return the singleton BirdSemanticSearch (lazy-loaded on first call)."""
    global _searcher_instance
    if _searcher_instance is None:
        logger.info("Loading BirdSemanticSearch (mxbai-embed-large-v1) ...")
        search_mod = key_files.search_mod()
        _searcher_instance = search_mod.BirdSemanticSearch(
            embeddings_dir=key_files.embeddings_dir,
        )
        logger.info(
            "BirdSemanticSearch loaded: %d bird embeddings, dim %d",
            _searcher_instance.embeddings.shape[0],
            _searcher_instance.embeddings.shape[1],
        )
    return _searcher_instance
