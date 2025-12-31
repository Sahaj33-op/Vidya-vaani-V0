"""
Prometheus Metrics Middleware for FastAPI
Tracks request metrics, response times, and error rates
"""

import logging
import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)

try:
    from prometheus_client import (
        CONTENT_TYPE_LATEST,
        Counter,
        Gauge,
        Histogram,
        generate_latest,
    )

    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False
    logger.warning(
        "prometheus_client not installed. Install with: pip install prometheus-client"
    )


if PROMETHEUS_AVAILABLE:
    REQUEST_COUNT = Counter(
        "http_requests_total",
        "Total HTTP requests",
        ["method", "endpoint", "status_code"],
    )

    REQUEST_DURATION = Histogram(
        "http_request_duration_seconds",
        "HTTP request duration in seconds",
        ["method", "endpoint"],
    )

    ACTIVE_REQUESTS = Gauge(
        "http_requests_in_progress",
        "Number of HTTP requests in progress",
        ["method", "endpoint"],
    )

    ERROR_COUNT = Counter(
        "http_errors_total", "Total HTTP errors", ["method", "endpoint", "error_type"]
    )

    LLM_REQUEST_COUNT = Counter(
        "llm_requests_total", "Total LLM API requests", ["provider", "status"]
    )

    LLM_REQUEST_DURATION = Histogram(
        "llm_request_duration_seconds",
        "LLM API request duration in seconds",
        ["provider"],
    )

    TRANSLATION_COUNT = Counter(
        "translation_requests_total",
        "Total translation requests",
        ["source_lang", "target_lang", "provider"],
    )

    RAG_SEARCH_DURATION = Histogram(
        "rag_search_duration_seconds", "RAG search duration in seconds"
    )


class PrometheusMetricsMiddleware(BaseHTTPMiddleware):
    """Middleware to collect Prometheus metrics"""

    def __init__(self, app: ASGIApp):
        super().__init__(app)
        if not PROMETHEUS_AVAILABLE:
            logger.warning(
                "Prometheus metrics disabled - prometheus_client not available"
            )

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if not PROMETHEUS_AVAILABLE:
            return await call_next(request)

        if request.url.path == "/metrics":
            return await call_next(request)

        method = request.method
        endpoint = request.url.path

        ACTIVE_REQUESTS.labels(method=method, endpoint=endpoint).inc()

        start_time = time.time()

        try:
            response = await call_next(request)

            duration = time.time() - start_time
            status_code = response.status_code

            REQUEST_COUNT.labels(
                method=method, endpoint=endpoint, status_code=status_code
            ).inc()

            REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(duration)

            if status_code >= 500:
                ERROR_COUNT.labels(
                    method=method, endpoint=endpoint, error_type="5xx"
                ).inc()
            elif status_code >= 400:
                ERROR_COUNT.labels(
                    method=method, endpoint=endpoint, error_type="4xx"
                ).inc()

            return response

        except Exception as e:
            duration = time.time() - start_time

            ERROR_COUNT.labels(
                method=method, endpoint=endpoint, error_type=type(e).__name__
            ).inc()

            REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(duration)

            raise

        finally:
            ACTIVE_REQUESTS.labels(method=method, endpoint=endpoint).dec()


def get_metrics() -> bytes:
    """Generate Prometheus metrics output"""
    if not PROMETHEUS_AVAILABLE:
        return b"# Prometheus metrics not available\n"

    return generate_latest()


def get_metrics_content_type() -> str:
    """Get Prometheus metrics content type"""
    if not PROMETHEUS_AVAILABLE:
        return "text/plain"

    return CONTENT_TYPE_LATEST


def track_llm_request(provider: str, duration: float, success: bool):
    """Track LLM API request metrics"""
    if not PROMETHEUS_AVAILABLE:
        return

    status = "success" if success else "error"
    LLM_REQUEST_COUNT.labels(provider=provider, status=status).inc()
    LLM_REQUEST_DURATION.labels(provider=provider).observe(duration)


def track_translation(source_lang: str, target_lang: str, provider: str):
    """Track translation request metrics"""
    if not PROMETHEUS_AVAILABLE:
        return

    TRANSLATION_COUNT.labels(
        source_lang=source_lang, target_lang=target_lang, provider=provider
    ).inc()


def track_rag_search(duration: float):
    """Track RAG search metrics"""
    if not PROMETHEUS_AVAILABLE:
        return

    RAG_SEARCH_DURATION.observe(duration)
