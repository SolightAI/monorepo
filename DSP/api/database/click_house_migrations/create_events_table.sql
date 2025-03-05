CREATE TABLE IF NOT EXISTS campaign_events (
    event_time DateTime('Asia/Istanbul'),
    campaign_id UInt32,
    event_type Enum8('impression' = 1, 'click' = 2, 'conversion' = 3),
    user_id String,
    publisher_id String,
    ip_address String,
    user_agent String,
    geo_country LowCardinality(String),
    cost_usd Float32,

    -- Optimization for ClickHouse
    _partition_date Date MATERIALIZED toDate(event_time)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(_partition_date)
ORDER BY (campaign_id, event_time)
SETTINGS index_granularity = 8192;

-- Create a materialized view for real-time aggregations
CREATE MATERIALIZED VIEW campaign_stats_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (campaign_id, date)
AS SELECT
    campaign_id,
    toDate(event_time) as date,
    count() FILTER (WHERE event_type = 'impression') AS impressions,
    count() FILTER (WHERE event_type = 'click') AS clicks,
    count() FILTER (WHERE event_type = 'conversion') AS conversions,
    sum(cost_usd) as total_cost
FROM campaign_events
GROUP BY campaign_id, toDate(event_time);
