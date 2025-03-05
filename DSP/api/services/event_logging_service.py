import os
import redis
import json
import asyncio
import dateutil.parser
import logging

from datetime import datetime, timezone
from typing import Literal, Optional
from pydantic import BaseModel
from clickhouse_driver import Client
from fastapi import BackgroundTasks


# Configure Redis
redis_client = redis.Redis(
    host=os.getenv('REDIS_HOST'),
    port=os.getenv('REDIS_PORT'),
    db=0,
    decode_responses=True
)

# Configure ClickHouse
clickhouse_client = Client(
    host=os.getenv('CLICKHOUSE_HOST'),
    port=int(os.getenv('CLICKHOUSE_PORT')),
    user=os.getenv('CLICKHOUSE_USER'),
    password=os.getenv('CLICKHOUSE_PASSWORD'),
)


# clickhouse event model
class CampaignEvent(BaseModel):
    campaign_id: int
    event_type: Literal['impression', 'click', 'conversion']
    user_id: Optional[str]
    publisher_id: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    geo_country: Optional[str]
    cost_usd: float
    event_time: datetime = datetime.now(timezone.utc)


async def log_event(event: CampaignEvent, background_tasks: BackgroundTasks):
    """Log event to Redis queue"""
    event_data = event.model_dump_json()
    redis_client.lpush('campaign_events', event_data)
    # Ensure the consumer is running
    background_tasks.add_task(ensure_consumer_running)

async def ensure_consumer_running():
    """Ensure the event consumer is running"""
    if not redis_client.get('event_consumer_heartbeat'):
        await process_events()

async def process_events():
    """Process events from Redis and write to ClickHouse"""
    batch_size = 2
    batch_timeout = 5  # seconds
    try:
        # Update heartbeat
        redis_client.setex('event_consumer_heartbeat', batch_timeout + 1, 'alive')
        logging.error("Heartbeat updated")

        start_time = datetime.now(timezone.utc)
        while True:
            batch = []
            # Make start_time timezone-aware
            logging.error(f"Start time: {start_time}")
            is_timeout = (datetime.now(timezone.utc) - start_time).seconds >= batch_timeout

            while len(batch) < batch_size and not is_timeout:
                event_data = redis_client.rpop('campaign_events')
                logging.error(f"Event data: {event_data}")

                if not event_data:
                    logging.error("No event data")
                    await asyncio.sleep(0.5)
                    break  # Exit inner loop if no data

                event = json.loads(event_data)

                # Parse the event_time string back to a datetime object
                event_time = dateutil.parser.parse(event['event_time'])

                batch.append({
                    'event_time': event_time,
                    'campaign_id': event['campaign_id'],
                    'event_type': event['event_type'],
                    'user_id': event['user_id'],
                    'publisher_id': event['publisher_id'],
                    'ip_address': event['ip_address'],
                    'user_agent': event['user_agent'],
                    'geo_country': event['geo_country'],
                    'cost_usd': event['cost_usd']
                })
                logging.error(f"Batch: {batch} updated")

            if batch:
                logging.error(f"Going to write batch to ClickHouse")
                start_time = datetime.now(timezone.utc)
                # Write batch to ClickHouse
                result = clickhouse_client.execute(
                    '''
                    INSERT INTO campaign_events (
                        event_time, campaign_id, event_type, user_id,
                        publisher_id, ip_address, user_agent, geo_country, cost_usd
                    ) VALUES
                    ''',
                    batch
                )
                logging.error(f"Result: {result}")

            if is_timeout:
                logging.error(f"Timeout reached, terminating")
                break

    except Exception as e:
        logging.error(f"Error processing events: {e}")
        await asyncio.sleep(1)
