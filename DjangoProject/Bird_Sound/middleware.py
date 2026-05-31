"""
Request-scoped context propagated into every log record.

`RequestIDMiddleware` assigns a short UUID to each incoming request,
stores it in a ContextVar (so it survives async boundaries), and echoes
it back to the client as `X-Request-ID`. Clients can also supply their
own `X-Request-ID` header and we'll honour it (useful when correlating
with an upstream proxy / frontend trace).

`RequestIDFilter` is a logging filter that pulls the current request_id
from the ContextVar and attaches it to every log record. It's wired up
in settings.LOGGING so you don't need to touch individual log calls.
"""

import logging
import threading
import uuid
from contextvars import ContextVar

import psutil
from django.conf import settings
from django.http import JsonResponse

_request_id: ContextVar[str] = ContextVar("request_id", default="-")


def get_current_request_id() -> str:
    return _request_id.get()


class RequestIDMiddleware:
    """Assigns an X-Request-ID per request and exposes it via ContextVar."""

    HEADER = "HTTP_X_REQUEST_ID"
    RESPONSE_HEADER = "X-Request-ID"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        rid = request.META.get(self.HEADER) or uuid.uuid4().hex[:12]
        # Clamp to a sane length to block header-smuggling via oversized IDs.
        rid = rid[:64]
        token = _request_id.set(rid)
        try:
            response = self.get_response(request)
        finally:
            _request_id.reset(token)
        response[self.RESPONSE_HEADER] = rid
        return response


class RequestIDFilter(logging.Filter):
    """Injects `request_id` onto every log record (default '-' outside a request)."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_current_request_id()
        return True


class TrafficGuardMiddleware:
    """Process-local back-pressure for expensive ECS tasks."""

    _lock = threading.Lock()
    _in_flight = 0
    _path_in_flight = {}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not settings.TRAFFIC_GUARD_ENABLED or request.path in settings.TRAFFIC_GUARD_BYPASS_PATHS:
            return self.get_response(request)

        path_key, path_limit = _matching_path_limit(request.path)
        reject_reason = self._try_acquire(path_key, path_limit)
        if reject_reason:
            return _busy_response(reject_reason)

        released = False

        def release_once():
            nonlocal released
            if released:
                return
            released = True
            self._release(path_key)

        try:
            response = self.get_response(request)
        except Exception:
            release_once()
            raise

        if getattr(response, "streaming", False):
            response.streaming_content = _release_after_stream(
                response.streaming_content,
                release_once,
            )
            return response

        release_once()
        return response

    def _try_acquire(self, path_key: str | None, path_limit: int | None) -> str | None:
        if psutil.virtual_memory().available < settings.MIN_FREE_MEMORY_BYTES:
            return "low_memory"

        with self._lock:
            if self._in_flight >= settings.MAX_IN_FLIGHT_REQUESTS:
                return "too_many_requests"
            if path_key and self._path_in_flight.get(path_key, 0) >= path_limit:
                return "too_many_path_requests"

            self._in_flight += 1
            if path_key:
                self._path_in_flight[path_key] = self._path_in_flight.get(path_key, 0) + 1
            return None

    def _release(self, path_key: str | None) -> None:
        with self._lock:
            self._in_flight = max(0, self._in_flight - 1)
            if path_key:
                self._path_in_flight[path_key] = max(0, self._path_in_flight.get(path_key, 0) - 1)


def _matching_path_limit(path: str) -> tuple[str | None, int | None]:
    for prefix, limit in settings.TRAFFIC_GUARD_PATH_LIMITS:
        if path.startswith(prefix):
            return prefix, limit
    return None, None


def _busy_response(reason: str) -> JsonResponse:
    response = JsonResponse(
        {
            "error": "Server busy. Try again shortly.",
            "reason": reason,
            "request_id": get_current_request_id(),
        },
        status=503,
    )
    response["Retry-After"] = str(settings.TRAFFIC_GUARD_RETRY_AFTER_SECONDS)
    return response


def _release_after_stream(streaming_content, release_once):
    try:
        for chunk in streaming_content:
            yield chunk
    finally:
        release_once()
