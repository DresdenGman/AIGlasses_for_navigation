from __future__ import annotations

from collections import defaultdict, deque
from time import monotonic


class SlidingWindowRateLimiter:
    """Small in-memory limiter for a single trusted development server."""

    def __init__(self, limit: int, window_seconds: float = 60) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._requests: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str, now: float | None = None) -> bool:
        now = monotonic() if now is None else now
        requests = self._requests[key]
        while requests and now - requests[0] >= self.window_seconds:
            requests.popleft()
        if len(requests) >= self.limit:
            return False
        requests.append(now)
        return True
