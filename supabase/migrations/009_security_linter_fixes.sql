-- 009: Supabase database linter fixes
--
-- Addresses three WARN-level findings from the Supabase linter:
--   1. function_search_path_mutable — functions without a pinned search_path
--      can be hijacked by a malicious schema earlier in the caller's path.
--   2. anon/authenticated_security_definer_function_executable —
--      check_rate_limit/cleanup_rate_limits are SECURITY DEFINER and were
--      callable via RPC by anon/authenticated, letting any client tamper
--      with other callers' rate-limit counters. Per their own comments
--      (008_rate_limiting.sql) they're meant to be service-role only.
--   3. rls_policy_always_true — review_reports/review_votes INSERT policies
--      use WITH CHECK (true). This is intentional (anonymous "report a
--      review" / "was this helpful" writes, not yet wired to any UI —
--      verified no src/ code references them yet), so we keep public
--      inserts but add basic sanity checks and a dedup guard instead of
--      removing the capability.

-- ============================================
-- 1. Pin search_path on all SECURITY-relevant functions
-- ============================================

ALTER FUNCTION public.update_updated_at_column() SET search_path = pg_catalog, public;
ALTER FUNCTION public.generate_ticket_number() SET search_path = pg_catalog, public;
ALTER FUNCTION public.generate_invoice_number() SET search_path = pg_catalog, public;
ALTER FUNCTION public.generate_transaction_reference() SET search_path = pg_catalog, public;
ALTER FUNCTION public.generate_promotion_invoice_number() SET search_path = pg_catalog, public;
ALTER FUNCTION public.touch_promotion_ctr() SET search_path = pg_catalog, public;
ALTER FUNCTION public.record_advertisement_view(UUID) SET search_path = pg_catalog, public;
ALTER FUNCTION public.record_advertisement_click(UUID) SET search_path = pg_catalog, public;
ALTER FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) SET search_path = pg_catalog, public;
ALTER FUNCTION public.cleanup_rate_limits() SET search_path = pg_catalog, public;

-- ============================================
-- 2. Lock down the rate-limit SECURITY DEFINER functions to service_role
-- ============================================

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits() TO service_role;

-- ============================================
-- 3. Tighten (without removing) public inserts on review_reports/review_votes
-- ============================================

-- Guard against trivial spam: same email can't file the same report reason
-- on the same review more than once.
ALTER TABLE review_reports
    ADD CONSTRAINT review_reports_unique_reporter_reason
    UNIQUE (review_id, reported_by_email, reason);

DROP POLICY IF EXISTS "Anyone can insert a review report" ON review_reports;
CREATE POLICY "Anyone can insert a review report" ON review_reports
    FOR INSERT WITH CHECK (
        reported_by_email IS NOT NULL
        AND reported_by_email <> ''
        AND reported_by_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
        AND EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_reports.review_id)
    );

DROP POLICY IF EXISTS "Anyone can insert a review vote" ON review_votes;
CREATE POLICY "Anyone can insert a review vote" ON review_votes
    FOR INSERT WITH CHECK (
        voter_identifier IS NOT NULL
        AND voter_identifier <> ''
        AND EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_votes.review_id)
    );
