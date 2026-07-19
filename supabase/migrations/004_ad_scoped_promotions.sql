-- ============================================
-- AD-SCOPED PROMOTION CAMPAIGNS
-- ============================================
-- Lets a vendor_promotions row (banner_advertisement / newsletter_promotion /
-- search_promotion package types) point at the specific advertisements row
-- it's paying to run, mirroring the existing listing_id/destination_page_id
-- scoping already on this table. Apply after 003_phase6_promotions.sql and
-- 003_phase6_promotions_rls.sql.

ALTER TABLE vendor_promotions
    ADD COLUMN IF NOT EXISTS advertisement_id UUID REFERENCES advertisements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vendor_promotions_advertisement_id ON vendor_promotions(advertisement_id);
