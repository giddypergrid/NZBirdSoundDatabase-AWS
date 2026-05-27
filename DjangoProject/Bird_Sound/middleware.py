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
import uuid
from contextvars import ContextVar

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
