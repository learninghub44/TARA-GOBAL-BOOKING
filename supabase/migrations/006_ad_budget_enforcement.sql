-- ============================================
-- AD BUDGET / SPEND ENFORCEMENT
-- ============================================
-- Vendors already set budget + daily_cap when drafting an ad (see
-- 003_phase6_promotions.sql). This adds the missing piece: a vendor-declared
-- rate (cost_per_click / cost_per_impression — like a bid, not an extra
-- platform charge on top of the flat promotion package fee) and the
-- machinery to track spend against it per-day and lifetime, auto-pausing
-- the ad the instant either cap is hit. Everything is done inside a single
-- locking UPDATE per call so concurrent public traffic can't race past a cap.

ALTER TABLE advertisements
    ADD COLUMN IF NOT EXISTS cost_per_click DECIMAL(10, 4),
    ADD COLUMN IF NOT EXISTS cost_per_impression DECIMAL(10, 4),
    ADD COLUMN IF NOT EXISTS spent_today DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS spent_today_date DATE;

-- Records one impression: increments views, accrues spend at
-- cost_per_impression (if set), rolls spent_today over on a new day, and
-- flips status to 'paused' if this event pushed spend at/over budget or
-- daily_cap. Returns whether it just paused, so the caller can log an event.
CREATE OR REPLACE FUNCTION record_advertisement_view(p_ad_id UUID)
RETURNS TABLE(just_paused BOOLEAN) AS $$
DECLARE
    v_ad advertisements%ROWTYPE;
    v_spend DECIMAL(12, 2);
    v_spent_today DECIMAL(12, 2);
    v_new_status ad_status;
BEGIN
    SELECT * INTO v_ad FROM advertisements WHERE id = p_ad_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE;
        RETURN;
    END IF;

    v_spend := COALESCE(v_ad.cost_per_impression, 0);
    v_spent_today := CASE WHEN v_ad.spent_today_date IS DISTINCT FROM CURRENT_DATE THEN 0 ELSE v_ad.spent_today END + v_spend;

    v_new_status := v_ad.status;
    IF v_ad.status = 'active' AND (
        (v_ad.budget IS NOT NULL AND v_ad.spent + v_spend >= v_ad.budget) OR
        (v_ad.daily_cap IS NOT NULL AND v_spent_today >= v_ad.daily_cap)
    ) THEN
        v_new_status := 'paused';
    END IF;

    UPDATE advertisements
    SET views = views + 1,
        spent = spent + v_spend,
        spent_today = v_spent_today,
        spent_today_date = CURRENT_DATE,
        status = v_new_status
    WHERE id = p_ad_id;

    RETURN QUERY SELECT (v_new_status = 'paused' AND v_ad.status = 'active');
END;
$$ LANGUAGE plpgsql;

-- Same as above, but for a click at cost_per_click.
CREATE OR REPLACE FUNCTION record_advertisement_click(p_ad_id UUID)
RETURNS TABLE(just_paused BOOLEAN) AS $$
DECLARE
    v_ad advertisements%ROWTYPE;
    v_spend DECIMAL(12, 2);
    v_spent_today DECIMAL(12, 2);
    v_new_status ad_status;
BEGIN
    SELECT * INTO v_ad FROM advertisements WHERE id = p_ad_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE;
        RETURN;
    END IF;

    v_spend := COALESCE(v_ad.cost_per_click, 0);
    v_spent_today := CASE WHEN v_ad.spent_today_date IS DISTINCT FROM CURRENT_DATE THEN 0 ELSE v_ad.spent_today END + v_spend;

    v_new_status := v_ad.status;
    IF v_ad.status = 'active' AND (
        (v_ad.budget IS NOT NULL AND v_ad.spent + v_spend >= v_ad.budget) OR
        (v_ad.daily_cap IS NOT NULL AND v_spent_today >= v_ad.daily_cap)
    ) THEN
        v_new_status := 'paused';
    END IF;

    UPDATE advertisements
    SET clicks = clicks + 1,
        spent = spent + v_spend,
        spent_today = v_spent_today,
        spent_today_date = CURRENT_DATE,
        status = v_new_status
    WHERE id = p_ad_id;

    RETURN QUERY SELECT (v_new_status = 'paused' AND v_ad.status = 'active');
END;
$$ LANGUAGE plpgsql;

-- Superseded by the two functions above, which increment + spend + cap-check
-- in one locked statement.
DROP FUNCTION IF EXISTS increment_advertisement_views(UUID);
DROP FUNCTION IF EXISTS increment_advertisement_clicks(UUID);
