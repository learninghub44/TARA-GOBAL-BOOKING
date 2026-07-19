-- ============================================
-- ADVERTISEMENT ANALYTICS — atomic counters
-- ============================================
-- Public ad-serving/tracking endpoints hit these from unauthenticated
-- requests at volume, so counts are bumped via a function instead of a
-- read-then-write from the app to avoid lost updates under concurrency.

CREATE OR REPLACE FUNCTION increment_advertisement_views(p_ad_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE advertisements SET views = views + 1 WHERE id = p_ad_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_advertisement_clicks(p_ad_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE advertisements SET clicks = clicks + 1 WHERE id = p_ad_id;
END;
$$ LANGUAGE plpgsql;
