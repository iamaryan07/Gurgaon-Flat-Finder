import ipaddress
import json
import logging
import socket
import threading
from typing import Any

import pika

from app.core.config import settings

logger = logging.getLogger(__name__)

EXCHANGE = "prediction_events"
QUEUE = "prediction_created"
ROUTING_KEY = "prediction_created"


def _connection_parameters(url: str) -> pika.URLParameters:
    """Resolve the broker hostname to IPv4 so IPv6 timeouts are avoided.

    CloudAMQP hostnames resolve to IPv6 first, which hangs on networks without
    IPv6. Connecting to the resolved IPv4 address directly skips the retry, while
    the original hostname is preserved for TLS SNI and certificate verification.
    """
    params = pika.URLParameters(url)
    hostname = params.host
    try:
        ipaddress.ip_address(hostname)
        is_ip = True
    except ValueError:
        is_ip = False
    if hostname and not is_ip:
        ipv4 = _resolve_ipv4(hostname)
        if ipv4:
            if params.ssl_options is not None and params.ssl_options.server_hostname is None:
                params.ssl_options.server_hostname = hostname
            params.host = ipv4
    return params


def _resolve_ipv4(hostname: str) -> str | None:
    try:
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET, socket.SOCK_STREAM):
            return info[4][0]
    except OSError:
        return None
    return None


def publish_prediction_created(event: dict[str, Any]) -> None:
    """Publish a prediction_created event without blocking the prediction response.

    Runs in a daemon thread so a slow or unreachable broker can never delay the
    synchronous HTTP response. When RabbitMQ is not configured or fails, this
    silently drops the event and logs a single generic warning (never the URI
    or its credentials).
    """
    if not settings.rabbitmq_url:
        return
    thread = threading.Thread(
        target=_publish, args=(event, settings.rabbitmq_url), daemon=True
    )
    thread.start()


def _publish(event: dict[str, Any], url: str) -> None:
    try:
        connection = pika.BlockingConnection(_connection_parameters(url))
        channel = connection.channel()
        channel.exchange_declare(exchange=EXCHANGE, exchange_type="topic", durable=True)
        channel.queue_declare(queue=QUEUE, durable=True)
        channel.queue_bind(queue=QUEUE, exchange=EXCHANGE, routing_key=ROUTING_KEY)
        channel.basic_publish(
            exchange=EXCHANGE,
            routing_key=ROUTING_KEY,
            body=json.dumps(event, default=str),
            properties=pika.BasicProperties(
                content_type="application/json",
                delivery_mode=2,
            ),
        )
        connection.close()
    except Exception:
        logger.warning("RabbitMQ unavailable; prediction_created event was not published")
