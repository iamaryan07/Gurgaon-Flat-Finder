"""Build a reliable PostgreSQL connection URL for Neon.

Neon hostnames resolve to both IPv6 and IPv4 addresses. On networks without
IPv6, libpq tries the IPv6 addresses first and each attempt hangs until it
times out, making startup take 30s+. Resolving to an explicit IPv4 ``hostaddr``
and setting a ``connect_timeout`` makes connections fast and reliable.
"""

import socket
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

_CONNECT_TIMEOUT = "10"


def connection_url(url: str) -> str:
    parsed = urlparse(url)
    hostname = parsed.hostname or ""

    query = [(key, value) for key, value in parse_qsl(parsed.query)
             if key not in ("hostaddr", "connect_timeout")]

    if hostname and ":" not in hostname:
        hostaddr = resolve_ipv4(hostname)
        if hostaddr:
            query.append(("hostaddr", hostaddr))

    query.append(("connect_timeout", _CONNECT_TIMEOUT))

    return urlunparse(
        (parsed.scheme, parsed.netloc, parsed.path, parsed.params, urlencode(query), parsed.fragment)
    )


def resolve_ipv4(hostname: str) -> str | None:
    try:
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET, socket.SOCK_STREAM):
            return info[4][0]
    except OSError:
        return None
    return None
