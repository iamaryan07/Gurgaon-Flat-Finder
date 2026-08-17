import ipaddress
import json
import logging
import time
from typing import Any

import pika
from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties

from app.core.config import settings
from app.db.base import PredictionRequestRecord
from app.db.connection import resolve_ipv4
from app.db.session import get_db_session
from app.schemas.event import PredictionCreatedEvent

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("prediction-consumer")

EXCHANGE = "prediction_events"
QUEUE = "prediction_created"
ROUTING_KEY = "prediction_created"
EVENT_TYPE = "prediction_created"


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
        ipv4 = resolve_ipv4(hostname)
        if ipv4:
            if params.ssl_options is not None and params.ssl_options.server_hostname is None:
                params.ssl_options.server_hostname = hostname
            params.host = ipv4
    return params


def main() -> None:
    if not settings.rabbitmq_url:
        raise SystemExit("RABBITMQ_URL is not set; refusing to start the consumer")
    if not settings.database_url:
        raise SystemExit("DATABASE_URL is not set; refusing to start the consumer")

    connection = pika.BlockingConnection(_connection_parameters(settings.rabbitmq_url))
    channel = connection.channel()
    channel.exchange_declare(exchange=EXCHANGE, exchange_type="topic", durable=True)
    channel.queue_declare(queue=QUEUE, durable=True)
    channel.queue_bind(queue=QUEUE, exchange=EXCHANGE, routing_key=ROUTING_KEY)
    channel.basic_qos(prefetch_count=1)

    channel.basic_consume(queue=QUEUE, on_message_callback=_handle_message, auto_ack=False)
    logger.info("Prediction consumer started; waiting for messages on queue '%s'", QUEUE)

    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        logger.info("Stopping prediction consumer")
    finally:
        connection.close()


def _handle_message(
    channel: BlockingChannel,
    method: Basic.Deliver,
    _properties: BasicProperties,
    body: bytes,
) -> None:
    try:
        event = _parse_event(body)
    except Exception:
        logger.exception("Dropping malformed message that failed validation")
        channel.basic_ack(delivery_tag=method.delivery_tag)
        return

    if event.event != EVENT_TYPE:
        logger.warning("Ignoring unexpected event type '%s'", event.event)
        channel.basic_ack(delivery_tag=method.delivery_tag)
        return

    try:
        _persist(event)
    except Exception:
        logger.exception("Failed to persist prediction; requeueing message for redelivery")
        try:
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
        except Exception:
            logger.exception("Could not nack the failed message")
        time.sleep(1)
        return

    channel.basic_ack(delivery_tag=method.delivery_tag)


def _parse_event(body: bytes) -> PredictionCreatedEvent:
    payload: dict[str, Any] = json.loads(body)
    return PredictionCreatedEvent.model_validate(payload)


def _persist(event: PredictionCreatedEvent) -> None:
    session = get_db_session()
    try:
        session.add(
            PredictionRequestRecord(
                request_payload=event.request_payload,
                predicted_price_crore=event.predicted_price_crore,
            )
        )
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
