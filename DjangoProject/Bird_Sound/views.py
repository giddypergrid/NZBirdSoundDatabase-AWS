import logging
from mimetypes import guess_type
from pathlib import Path

import psutil
from django.conf import settings
from django.core.exceptions import RequestDataTooBig
from django.db import connection
from django.http import FileResponse
from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Bird, BirdSound
from .serializers import (
    BirdListFilterSerializer, BirdSerializer,
    BirdSoundFilterSerializer, BirdSoundSerializer,
    ClassifyResponseSerializer,
    SearchByDescriptionQuerySerializer, SearchByDescriptionResponseSerializer,
)

logger = logging.getLogger(__name__)


class BirdListPagination(PageNumberPagination):
    page_size = 10


class BirdSoundById(generics.RetrieveAPIView):
    """GET /birds/api/sounds/{id}/"""
    queryset = BirdSound.objects.all()
    serializer_class = BirdSoundSerializer


class BirdById(generics.RetrieveAPIView):
    """GET /birds/api/birds/{id}/"""
    queryset = Bird.objects.all()
    serializer_class = BirdSerializer


class BirdList(generics.ListAPIView):
    """GET /birds/api/birds/  -optional ?random, ?quantity (-1 disables paging)."""
    pagination_class = BirdListPagination
    serializer_class = BirdSerializer

    @extend_schema(parameters=[BirdListFilterSerializer])
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        s = BirdListFilterSerializer(data=self.request.query_params)
        s.is_valid(raise_exception=True)
        qs = Bird.objects.all()
        if s.validated_data.get('random'):
            qs = qs.order_by('?')
        quantity = s.validated_data.get('quantity')
        if quantity == -1:
            self.pagination_class = None
        elif quantity:
            qs = qs[:quantity]
        return qs


class BirdSoundList(generics.ListAPIView):
    """GET /birds/api/sounds/bird-label/{eBird}/ -paged, optional station/time filters."""
    serializer_class = BirdSoundSerializer
    pagination_class = BirdListPagination

    def get_queryset(self):
        qs = BirdSound.objects.all()
        ebird = self.kwargs.get('primary_label')
        if ebird:
            qs = qs.filter(eBird=ebird)

        s = BirdSoundFilterSerializer(data=self.request.query_params)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        if d.get('station'):
            qs = qs.filter(station=d['station'])
        if d.get('recording_mode'):
            qs = qs.filter(recording_mode=d['recording_mode'])
        if d.get('start_time'):
            qs = qs.filter(recording_datetime__gte=d['start_time'])
        if d.get('end_time'):
            qs = qs.filter(recording_datetime__lte=d['end_time'])
        return qs


def _serve_static_file(root: Path, relative: Path) -> FileResponse:
    """Safely stream a file under `root`. 403 on traversal, 404 on missing."""
    target = (root / relative).resolve()
    try:
        target.relative_to(root.resolve())
    except ValueError:
        raise PermissionDenied("Invalid file path")
    if not target.exists():
        raise NotFound("File not found")
    ctype, _ = guess_type(str(target))
    return FileResponse(open(target, 'rb'), content_type=ctype or 'application/octet-stream')


class AudioFileView(APIView):
    """GET /birds/api/audio/{eBird}/{filename}/"""
    def get(self, request, eBird, filename):
        return _serve_static_file(Path(settings.AUDIO_FILES_ROOT), Path(eBird) / filename)


class ImageFileView(APIView):
    """GET /birds/api/image/{eBird}/{index}/ -tries jpeg/jpg/png/webp."""
    def get(self, request, eBird, index):
        root = Path(settings.IMAGE_FILES_ROOT)
        for ext in ('jpeg', 'jpg', 'png', 'webp'):
            try:
                return _serve_static_file(root, Path(eBird) / f"{index}.{ext}")
            except NotFound:
                continue
        raise NotFound("File not found")


_EXT_TO_SUFFIX = {
    'wav': '.wav', 'flac': '.flac', 'mp3': '.mp3',
    'ogg': '.ogg', 'm4a': '.m4a',
}


class ClassifyAudioView(APIView):
    """
    POST /birds/api/classify/?ext=flac

    Raw audio bytes in the request body (no multipart). Body capped at
    settings.MAX_CLASSIFY_AUDIO_BYTES (5 MB). Rate-limited by 'classify'
    scope. Returns 503+Retry-After if host RAM is tight.
    """
    throttle_scope = 'classify'
    parser_classes = []  # skip DRF parsing; we read request.body directly

    @extend_schema(
        request={"application/octet-stream": {"type": "string", "format": "binary"}},
        responses={200: ClassifyResponseSerializer},
    )
    def post(self, request):
        max_bytes = settings.MAX_CLASSIFY_AUDIO_BYTES

        # Extension tells the classifier how to name its tempfile.
        ext = (request.query_params.get('ext') or '').lower().lstrip('.')
        suffix = _EXT_TO_SUFFIX.get(ext)
        if not suffix:
            return Response(
                {"error": f"Missing/invalid ?ext. Allowed: {list(_EXT_TO_SUFFIX)}"},
                status=400,
            )

        # Early size rejection via Content-Length.
        try:
            content_length = int(request.META.get('CONTENT_LENGTH') or 0)
        except (TypeError, ValueError):
            content_length = 0
        if content_length > max_bytes:
            return Response(
                {"error": f"Audio too large (>{max_bytes // (1024*1024)} MB)."},
                status=413,
            )

        # Back-pressure: refuse ML work when RAM is tight.
        available = psutil.virtual_memory().available
        if available < settings.MIN_FREE_MEMORY_BYTES:
            logger.warning("Classify rejected (low memory): %d MB available",
                           available // (1024 * 1024))
            resp = Response({"error": "Server busy. Try again shortly."}, status=503)
            resp["Retry-After"] = "30"
            return resp

        # Read body (Django will raise RequestDataTooBig above DATA_UPLOAD_MAX_MEMORY_SIZE).
        try:
            audio_bytes = request.body
        except RequestDataTooBig:
            return Response(
                {"error": f"Audio too large (>{max_bytes // (1024*1024)} MB)."},
                status=413,
            )
        if not audio_bytes:
            return Response({"error": "Empty request body."}, status=400)

        try:
            from .classifier import get_classifier
            return Response(get_classifier().classify_bytes(audio_bytes, suffix))
        except ValueError as e:
            logger.warning("Classification rejected: %s", e)
            return Response({"error": str(e)}, status=400)
        except Exception:
            logger.exception("Classification failed")
            return Response({"error": "Classification failed."}, status=500)


class SearchByDescriptionView(APIView):
    """
    GET /birds/api/search-by-description/?query=...&threshold=0.45&top_k=4

    Semantic search over bird descriptions. Always returns top_k hits;
    each carries `strong_match` (score > threshold) and `best_field`.
    """
    throttle_scope = 'search'

    @extend_schema(
        parameters=[SearchByDescriptionQuerySerializer],
        responses={200: SearchByDescriptionResponseSerializer},
    )
    def get(self, request):
        s = SearchByDescriptionQuerySerializer(data=request.query_params)
        s.is_valid(raise_exception=True)
        query = s.validated_data["query"]
        threshold = s.validated_data.get("threshold", 0.45)
        top_k = s.validated_data.get("top_k", 4)

        try:
            from .semantic_search import get_semantic_search
            hits = get_semantic_search().search(query, threshold=threshold, top_k=top_k)
        except FileNotFoundError as e:
            logger.error("Semantic search assets missing: %s", e)
            return Response({"error": "Semantic search not initialised."}, status=503)
        except Exception:
            logger.exception("Semantic search failed")
            return Response({"error": "Search failed."}, status=500)

        return Response({
            "query": query,
            "threshold": threshold,
            "count": len(hits),
            "results": [h.to_dict() for h in hits],
        })


class HealthCheckView(APIView):
    """
    GET /birds/api/healthz/
    Liveness/readiness probe for load balancers, Docker, k8s, uptime monitors.
    200 = healthy. 503 + JSON detail = at least one dependency is down.
    Throttling and auth are bypassed so probes are never rate-limited.
    """
    throttle_classes = []
    authentication_classes = []
    permission_classes = []

    @extend_schema(responses={200: dict, 503: dict})
    def get(self, request):
        checks = {}
        ok = True

        # DB ping -cheap SELECT 1.
        try:
            with connection.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
            checks["db"] = "ok"
        except Exception as e:
            checks["db"] = f"error: {type(e).__name__}"
            ok = False

        # Memory headroom -same threshold the classifier uses.
        try:
            available = psutil.virtual_memory().available
            checks["memory_available_mb"] = available // (1024 * 1024)
            checks["memory_ok"] = available >= settings.MIN_FREE_MEMORY_BYTES
            if not checks["memory_ok"]:
                ok = False
        except Exception as e:
            checks["memory_ok"] = False
            checks["memory_error"] = f"{type(e).__name__}: {e}"
            ok = False

        body = {"status": "ok" if ok else "degraded", **checks,
                "env": settings.DJANGO_ENV}
        return Response(body, status=200 if ok else 503)
