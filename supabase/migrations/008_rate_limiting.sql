-- 008: Rate limiting
--
-- Fixed-window rate limiter backed by Postgres so counts are correct across
-- serverless instances (an in-memory counter resets per lambda/edge worker
-- and gives no real protection in production). Used from
-- src/lib/security/rate-limit.ts via the service-role client only -- there
-- are no public policies, so anon/authenticated roles cannot read or write
-- this table directly.
--
-- The upsert + RETURNING pattern in check_rate_limit is a single atomic
-- statement, so concurrent requests for the same key cannot race each other
-- into both being "allowed".

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits (window_start);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage rate limits" ON rate_limits
  FOR ALL USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
) RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, reset_at TIMESTAMPTZ) AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  INSERT INTO rate_limits (key, count, window_start)
  VALUES (p_key, 1, v_now)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN rate_limits.window_start <= v_now - (p_window_seconds || ' seconds')::interval
        THEN 1
      ELSE rate_limits.count + 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start <= v_now - (p_window_seconds || ' seconds')::interval
        THEN v_now
      ELSE rate_limits.window_start
    END
  RETURNING rate_limits.count, rate_limits.window_start INTO v_count, v_window_start;

  RETURN QUERY SELECT
    v_count <= p_max_requests,
    GREATEST(0, p_max_requests - v_count),
    v_window_start + (p_window_seconds || ' seconds')::interval;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Housekeeping: call periodically (e.g. piggyback on the existing daily
-- cron routes) to keep the table from growing unbounded.
CREATE OR REPLACE FUNCTION cleanup_rate_limits() RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE window_start < now() - interval '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
