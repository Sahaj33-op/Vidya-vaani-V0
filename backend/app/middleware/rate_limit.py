import logging
import time
from collections import defaultdict
from threading import Lock
from typing import Dict, Tuple

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware using token bucket algorithm
    Tracks requests per IP address with sliding window
    """

    def __init__(self, app, requests_per_minute: int = 60, burst: int = 10):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.burst = burst
        self.rate = requests_per_minute / 60.0

        self.clients: Dict[str, Tuple[float, float]] = defaultdict(
            lambda: (time.time(), burst)
        )
        self.lock = Lock()
        self.last_cleanup = time.time()

    async def dispatch(self, request: Request, call_next):
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        excluded_paths = [
            "/health",
            "/health/live",
            "/health/ready",
            "/docs",
            "/redoc",
            "/openapi.json",
        ]
        if any(request.url.path.startswith(path) for path in excluded_paths):
            return await call_next(request)

        client_ip = self._get_client_ip(request)

        current_time = time.time()

        self._cleanup_old_entries(current_time)

        with self.lock:
            last_time, tokens = self.clients[client_ip]

            time_passed = current_time - last_time
            tokens = min(self.burst, tokens + time_passed * self.rate)

            if tokens >= 1:
                self.clients[client_ip] = (current_time, tokens - 1)
                response = await call_next(request)

                response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
                response.headers["X-RateLimit-Remaining"] = str(int(tokens - 1))
                response.headers["X-RateLimit-Reset"] = str(int(current_time + 60))

                return response
            else:
                self.clients[client_ip] = (current_time, tokens)

                retry_after = int((1 - tokens) / self.rate)

                logger.warning(f"Rate limit exceeded for IP: {client_ip}")

                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "detail": "Too many requests. Please try again later.",
                        "retry_after": retry_after,
                    },
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(self.requests_per_minute),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(int(current_time + retry_after)),
                    },
                )

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        return request.client.host if request.client else "unknown"

    def _cleanup_old_entries(self, current_time: float):
        """Remove old entries to prevent memory leak (run every 5 minutes)"""
        if current_time - self.last_cleanup > 300:
            with self.lock:
                cutoff_time = current_time - 600
                self.clients = defaultdict(
                    lambda: (current_time, self.burst),
                    {k: v for k, v in self.clients.items() if v[0] > cutoff_time},
                )
                self.last_cleanup = current_time
                logger.debug(
                    f"Cleaned up rate limit entries. Active clients: {len(self.clients)}"
                )
