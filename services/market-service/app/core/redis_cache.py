import json
import logging
from typing import Any, Callable, Optional, Tuple

import numpy as np
import redis

from app.core.config import settings

logger = logging.getLogger(__name__)

_fallback_warned = False


def _default(obj: Any) -> Any:
    if isinstance(obj, np.generic):
        return obj.item()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


class RedisCache:
    """Best-effort Redis cache that never breaks the API.

    Every operation swallows errors and degrades to a no-op, so Redis being
    down, timing out, or returning an error can never take down a request.
    The client connects lazily, so it recovers automatically if Redis returns.
    """

    def __init__(self, url: str, ttl_seconds: int):
        self.ttl_seconds = ttl_seconds
        self._client: Optional[redis.Redis] = None
        if url:
            self._client = redis.Redis.from_url(
                url,
                socket_connect_timeout=2,
                socket_timeout=2,
                decode_responses=True,
            )

    def get(self, key: str) -> Optional[Any]:
        if self._client is None:
            return None
        try:
            raw = self._client.get(key)
            return None if raw is None else json.loads(raw)
        except Exception:
            self._warn_fallback()
            return None

    def set(self, key: str, value: Any) -> None:
        if self._client is None:
            return
        try:
            self._client.set(key, json.dumps(value, default=_default), ex=self.ttl_seconds)
        except Exception:
            self._warn_fallback()

    @staticmethod
    def _warn_fallback() -> None:
        global _fallback_warned
        if not _fallback_warned:
            logger.warning("Redis cache unavailable; using direct computation fallback")
            _fallback_warned = True


_cache: Optional[RedisCache] = None


def get_cache() -> RedisCache:
    global _cache
    if _cache is None:
        _cache = RedisCache(settings.redis_url, settings.redis_cache_ttl_seconds)
    return _cache


def cached(key: str, compute: Callable[[], Any]) -> Tuple[Any, bool]:
    """Return (result, hit). On a miss, runs ``compute`` and caches the result."""
    cache = get_cache()
    hit = cache.get(key)
    if hit is not None:
        return hit, True
    result = compute()
    cache.set(key, result)
    return result, False
