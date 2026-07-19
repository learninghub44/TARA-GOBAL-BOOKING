-- ============================================
-- PHASE 6 — ROW LEVEL SECURITY POLICIES
-- ============================================
-- Apply after 003_phase6_promotions.sql.

ALTER TABLE promotion_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_featured ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisement_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisement_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE destination_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE destination_galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROMOTION PACKAGES — public read (catalog), service role manages
-- ============================================

CREATE POLICY "Service role can manage promotion packages" ON promotion_packages
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public can read active promotion packages" ON promotion_packages
    FOR SELECT USING (is_active = TRUE);

-- ============================================
-- VENDOR PROMOTIONS
-- ============================================

CREATE POLICY "Service role can manage vendor promotions" ON vendor_promotions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Platform admins can read all vendor promotions" ON vendor_promotions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'owner' AND users.tenant_id IS NULL)
    );

CREATE POLICY "Tenant users can read own vendor promotions" ON vendor_promotions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.tenant_id = vendor_promotions.tenant_id)
    );

CREATE POLICY "Tenant owners/managers can insert vendor promotions" ON vendor_promotions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = vendor_promotions.tenant_id
            AND users.role IN ('owner', 'manager')
        )
    );

CREATE POLICY "Tenant owners/managers can update own vendor promotions" ON vendor_promotions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = vendor_promotions.tenant_id
            AND users.role IN ('owner', 'manager')
        )
    );

-- ============================================
-- FEATURED LISTINGS — public read, service role writes
-- ============================================

CREATE POLICY "Service role can manage featured listings" ON featured_listings
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public can read active featured listings" ON featured_listings
    FOR SELECT USING (status = 'active');

CREATE POLICY "Tenant users can read own featured listings" ON featured_listings
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.tenant_id = featured_listings.tenant_id)
    );

-- ============================================
-- HOMEPAGE SECTIONS / FEATURED — public read, service role + admin write
-- ============================================

CREATE POLICY "Service role can manage homepage sections" ON homepage_sections
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public can read enabled homepage sections" ON homepage_sections
    FOR SELECT USING (is_enabled = TRUE);

CREATE POLICY "Platform admins can manage homepage sections" ON homepage_sections
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'owner' AND users.tenant_id IS NULL)
    );

CREATE POLICY "Service role can manage homepage featured" ON homepage_featured
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public can read homepage featured" ON homepage_featured
    FOR SELECT USING (TRUE);

-- ============================================
-- ADVERTISEMENTS
-- ============================================

CREATE POLICY "Service role can manage advertisements" ON advertisements
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public can read active advertisements" ON advertisements
    FOR SELECT USING (status = 'active');

CREATE POLICY "Platform admins can read all advertisements" ON advertisements
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'owner' AND users.tenant_id IS NULL)
    );

CREATE POLICY "Tenant users can read own advertisements" ON advertisements
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.tenant_id = advertisements.tenant_id)
    );

CREATE POLICY "Tenant owners/managers can insert advertisements" ON advertisements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = advertisements.tenant_id
            AND users.role IN ('owner', 'manager')
        )
    );

CREATE POLICY "Tenant owners/managers can update own advertisements" ON advertisements
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = advertisements.tenant_id
            AND users.role IN ('owner', 'manager')
        )
    );

CREATE POLICY "Service role can manage advertisement clicks" ON advertisement_clicks
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage advertisement views" ON advertisement_views
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- PROMOTION BILLING
-- ============================================

CREATE POLICY "Service role can manage promotion payments" ON promotion_payments
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Tenant users can read own promotion payments" ON promotion_payments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.tenant_id = promotion_payments.tenant_id)
    );

CREATE POLICY "Service role can manage promotion invoices" ON promotion_invoices
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Tenant users can read own promotion invoices" ON promotion_invoices
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.tenant_id = promotion_invoices.tenant_id)
    );

CREATE POLICY "Service role can manage promotion analytics" ON promotion_analytics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Tenant users can read own promotion analytics" ON promotion_analytics
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.tenant_id = promotion_analytics.tenant_id)
    );

-- ============================================
-- DESTINATION PAGES — public read published, admin manages
-- ============================================

CREATE POLICY "Service role can manage destination pages" ON destination_pages
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public can read published destination pages" ON destination_pages
    FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Platform admins can manage destination pages" ON destination_pages
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'owner' AND users.tenant_id IS NULL)
    );

CREATE POLICY "Service role can manage destination galleries" ON destination_galleries
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public can read destination galleries" ON destination_galleries
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM destination_pages dp WHERE dp.id = destination_galleries.destination_page_id AND dp.is_published = TRUE)
    );

-- ============================================
-- VENDOR PUBLIC PROFILE / BADGES / AWARDS — public read, vendor manages own
-- ============================================

CREATE POLICY "Service role can manage vendor public profiles" ON vendor_public_profiles
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public can read vendor public profiles" ON vendor_public_profiles
    FOR SELECT USING (TRUE);

CREATE POLICY "Tenant owners/managers can update own public profile" ON vendor_public_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = vendor_public_profiles.tenant_id
            AND users.role IN ('owner', 'manager')
        )
    );

CREATE POLICY "Tenant owners/managers can insert own public profile" ON vendor_public_profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = vendor_public_profiles.tenant_id
            AND users.role IN ('owner', 'manager')
        )
    );

CREATE POLICY "Service role can manage vendor badges" ON vendor_badges
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public can read vendor badges" ON vendor_badges
    FOR SELECT USING (TRUE);

CREATE POLICY "Service role can manage vendor awards" ON vendor_awards
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public can read vendor awards" ON vendor_awards
    FOR SELECT USING (TRUE);

-- ============================================
-- REVIEW REPORTS / VOTES
-- ============================================

CREATE POLICY "Service role can manage review reports" ON review_reports
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can insert a review report" ON review_reports
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Platform admins can read all review reports" ON review_reports
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'owner' AND users.tenant_id IS NULL)
    );

CREATE POLICY "Service role can manage review votes" ON review_votes
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public can read review votes" ON review_votes
    FOR SELECT USING (TRUE);

CREATE POLICY "Anyone can insert a review vote" ON review_votes
    FOR INSERT WITH CHECK (TRUE);

-- ============================================
-- RANKING / SEARCH SCORES — public read, service role writes
-- ============================================

CREATE POLICY "Service role can manage listing rankings" ON listing_rankings
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public can read listing rankings" ON listing_rankings
    FOR SELECT USING (TRUE);

CREATE POLICY "Service role can manage search scores" ON search_scores
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public can read search scores" ON search_scores
    FOR SELECT USING (TRUE);

-- ============================================
-- PROMOTION EVENTS — tenant-scoped notifications
-- ============================================

CREATE POLICY "Service role can manage promotion events" ON promotion_events
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Tenant users can read own promotion events" ON promotion_events
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.tenant_id = promotion_events.tenant_id)
    );

CREATE POLICY "Tenant users can mark own promotion events read" ON promotion_events
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.tenant_id = promotion_events.tenant_id)
    );
