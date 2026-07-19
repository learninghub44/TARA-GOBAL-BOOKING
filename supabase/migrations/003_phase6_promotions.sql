-- ============================================
-- PHASE 6 — VENDOR GROWTH & PROMOTION PLATFORM
-- ============================================
-- Adds optional, vendor-paid promotional products on top of the existing
-- subscription model. Does NOT touch the booking flow, does NOT process
-- customer payments, does NOT introduce commissions or vendor wallets.
-- Apply after schema.sql, migrations/002_payment_admin_and_refunds.sql,
-- and rls_policies.sql. Run 003_phase6_promotions_rls.sql immediately after
-- this file.

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE promotion_type AS ENUM (
    'featured_listing',
    'sponsored_listing',
    'premium_listing',
    'premium_badge',
    'homepage_featured',
    'destination_featured',
    'category_featured',
    'trending_listing',
    'editors_pick',
    'banner_advertisement',
    'newsletter_promotion',
    'search_promotion'
);

CREATE TYPE promotion_placement AS ENUM (
    'homepage',
    'destination',
    'category',
    'search',
    'sidebar',
    'newsletter',
    'popup',
    'listing_page'
);

CREATE TYPE promotion_status AS ENUM (
    'pending',
    'active',
    'paused',
    'expired',
    'rejected',
    'cancelled'
);

CREATE TYPE ad_type AS ENUM (
    'homepage_banner',
    'sidebar_banner',
    'category_banner',
    'destination_banner',
    'search_promotion',
    'newsletter_promotion',
    'popup_promotion',
    'sponsored_search'
);

CREATE TYPE ad_status AS ENUM (
    'draft',
    'pending_review',
    'active',
    'paused',
    'expired',
    'rejected'
);

CREATE TYPE billing_cycle AS ENUM ('fixed', 'daily', 'weekly', 'monthly');

CREATE TYPE review_report_reason AS ENUM ('spam', 'offensive', 'fake', 'irrelevant', 'other');
CREATE TYPE review_report_status AS ENUM ('pending', 'reviewed', 'dismissed', 'actioned');
CREATE TYPE review_vote_type AS ENUM ('helpful', 'not_helpful');

CREATE TYPE badge_type AS ENUM (
    'verified',
    'top_rated',
    'fast_responder',
    'premium_partner',
    'rising_star',
    'trusted_vendor',
    'anniversary',
    'other'
);

-- ============================================
-- PROMOTION PACKAGES (admin-managed catalog / pricing)
-- ============================================

CREATE TABLE promotion_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    promotion_type promotion_type NOT NULL,
    placement promotion_placement,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
    billing_cycle billing_cycle NOT NULL DEFAULT 'fixed',
    duration_days INTEGER NOT NULL DEFAULT 7,
    max_active_slots INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- VENDOR PROMOTIONS (a vendor's purchased/active promotion campaign)
-- ============================================

CREATE TABLE vendor_promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    package_id UUID REFERENCES promotion_packages(id) ON DELETE SET NULL,
    promotion_type promotion_type NOT NULL,
    placement promotion_placement,
    listing_id UUID,
    listing_type listing_type,
    destination_page_id UUID,
    title VARCHAR(255),
    priority_score INTEGER DEFAULT 0,
    position INTEGER,
    status promotion_status NOT NULL DEFAULT 'pending',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'KES',
    auto_renew BOOLEAN DEFAULT FALSE,
    views INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    bookings_generated INTEGER DEFAULT 0,
    revenue_generated DECIMAL(12, 2) DEFAULT 0,
    rejected_reason TEXT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT vendor_promotions_tenant_id_check CHECK (tenant_id IS NOT NULL)
);

-- ============================================
-- FEATURED LISTINGS (fast-lookup active placements, Agent 1)
-- ============================================

CREATE TABLE featured_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_promotion_id UUID NOT NULL REFERENCES vendor_promotions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL,
    listing_type listing_type NOT NULL,
    placement promotion_placement NOT NULL DEFAULT 'homepage',
    priority_score INTEGER DEFAULT 0,
    position INTEGER,
    status promotion_status NOT NULL DEFAULT 'active',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    views INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    bookings_generated INTEGER DEFAULT 0,
    revenue_generated DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- HOMEPAGE SECTIONS + FEATURED ITEMS (Agent 2)
-- ============================================

CREATE TABLE homepage_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(150) NOT NULL,
    section_type VARCHAR(50) NOT NULL DEFAULT 'curated',
    is_enabled BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    max_listings INTEGER DEFAULT 12,
    schedule_start TIMESTAMP WITH TIME ZONE,
    schedule_end TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE homepage_featured (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES homepage_sections(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL,
    listing_type listing_type NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vendor_promotion_id UUID REFERENCES vendor_promotions(id) ON DELETE SET NULL,
    display_priority INTEGER DEFAULT 0,
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ADVERTISEMENTS (Agent 3)
-- ============================================

CREATE TABLE advertisements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vendor_promotion_id UUID REFERENCES vendor_promotions(id) ON DELETE SET NULL,
    ad_type ad_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    video_url TEXT,
    cta_text VARCHAR(100),
    landing_url TEXT NOT NULL,
    status ad_status NOT NULL DEFAULT 'draft',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    budget DECIMAL(12, 2),
    daily_cap DECIMAL(12, 2),
    spent DECIMAL(12, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'KES',
    target_categories TEXT[],
    target_destinations TEXT[],
    target_countries TEXT[],
    views INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    rejected_reason TEXT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT advertisements_tenant_id_check CHECK (tenant_id IS NOT NULL)
);

CREATE TABLE advertisement_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
    listing_id UUID,
    ip_address VARCHAR(50),
    user_agent TEXT,
    referrer TEXT,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE advertisement_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
    ip_address VARCHAR(50),
    user_agent TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PROMOTION BILLING (Agent 9)
-- ============================================

CREATE TABLE promotion_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_promotion_id UUID NOT NULL REFERENCES vendor_promotions(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
    status payment_status NOT NULL DEFAULT 'pending',
    is_renewal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE promotion_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    vendor_promotion_id UUID NOT NULL REFERENCES vendor_promotions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
    status payment_status NOT NULL DEFAULT 'pending',
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE promotion_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_promotion_id UUID NOT NULL REFERENCES vendor_promotions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    bookings INTEGER DEFAULT 0,
    revenue DECIMAL(12, 2) DEFAULT 0,
    ctr DECIMAL(6, 4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (vendor_promotion_id, date)
);

-- ============================================
-- DESTINATION PAGES (Agent 5)
-- ============================================

CREATE TABLE destination_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    hero_image_url TEXT,
    description TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    best_time_to_visit TEXT,
    transportation_info TEXT,
    local_currency VARCHAR(10),
    emergency_contacts JSONB DEFAULT '[]',
    travel_tips TEXT[],
    faq JSONB DEFAULT '[]',
    is_published BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE destination_galleries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    destination_page_id UUID NOT NULL REFERENCES destination_pages(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE vendor_promotions
    ADD CONSTRAINT vendor_promotions_destination_page_fk
    FOREIGN KEY (destination_page_id) REFERENCES destination_pages(id) ON DELETE SET NULL;

-- ============================================
-- VENDOR PUBLIC PROFILE (Agent 7)
-- ============================================

CREATE TABLE vendor_public_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    business_story TEXT,
    years_in_business INTEGER,
    operating_hours JSONB DEFAULT '{}',
    languages TEXT[],
    licenses TEXT[],
    certificates TEXT[],
    social_links JSONB DEFAULT '{}',
    response_time_minutes INTEGER,
    cancellation_policy TEXT,
    refund_policy TEXT,
    gallery_video_urls TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE vendor_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    badge_type badge_type NOT NULL,
    label VARCHAR(100) NOT NULL,
    icon_url TEXT,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    awarded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE vendor_awards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    awarded_by VARCHAR(255),
    award_date DATE,
    icon_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- REVIEW SYSTEM ADDITIONS (Agent 8)
-- ============================================

CREATE TABLE review_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    reported_by_email VARCHAR(255) NOT NULL,
    reason review_report_reason NOT NULL,
    details TEXT,
    status review_report_status NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE review_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    voter_identifier VARCHAR(255) NOT NULL,
    vote_type review_vote_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (review_id, voter_identifier)
);

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS vendor_reply TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS vendor_replied_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS photo_urls TEXT[];
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS video_urls TEXT[];
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS not_helpful_count INTEGER DEFAULT 0;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;

-- ============================================
-- SEARCH RANKING ENGINE (Agent 6)
-- ============================================

CREATE TABLE listing_rankings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL,
    listing_type listing_type NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_score DECIMAL(6, 2) DEFAULT 0,
    verified_score DECIMAL(6, 2) DEFAULT 0,
    featured_score DECIMAL(6, 2) DEFAULT 0,
    rating_score DECIMAL(6, 2) DEFAULT 0,
    booking_score DECIMAL(6, 2) DEFAULT 0,
    response_score DECIMAL(6, 2) DEFAULT 0,
    activity_score DECIMAL(6, 2) DEFAULT 0,
    completeness_score DECIMAL(6, 2) DEFAULT 0,
    image_score DECIMAL(6, 2) DEFAULT 0,
    availability_score DECIMAL(6, 2) DEFAULT 0,
    admin_featured_score DECIMAL(6, 2) DEFAULT 0,
    trending_score DECIMAL(6, 2) DEFAULT 0,
    freshness_score DECIMAL(6, 2) DEFAULT 0,
    popularity_score DECIMAL(6, 2) DEFAULT 0,
    total_score DECIMAL(8, 2) DEFAULT 0,
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (listing_id, listing_type)
);

CREATE TABLE search_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL,
    listing_type listing_type NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    keyword_boost JSONB DEFAULT '{}',
    manual_boost DECIMAL(6, 2) DEFAULT 0,
    sponsored_search BOOLEAN DEFAULT FALSE,
    vendor_promotion_id UUID REFERENCES vendor_promotions(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (listing_id, listing_type)
);

-- ============================================
-- PROMOTION EVENTS (notifications, Agent 10)
-- ============================================

CREATE TABLE promotion_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    vendor_promotion_id UUID REFERENCES vendor_promotions(id) ON DELETE CASCADE,
    advertisement_id UUID REFERENCES advertisements(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_promotion_packages_active ON promotion_packages(is_active);
CREATE INDEX idx_promotion_packages_type ON promotion_packages(promotion_type);

CREATE INDEX idx_vendor_promotions_tenant_id ON vendor_promotions(tenant_id);
CREATE INDEX idx_vendor_promotions_status ON vendor_promotions(status);
CREATE INDEX idx_vendor_promotions_listing ON vendor_promotions(listing_id, listing_type);
CREATE INDEX idx_vendor_promotions_end_date ON vendor_promotions(end_date);
CREATE INDEX idx_vendor_promotions_type ON vendor_promotions(promotion_type);

CREATE INDEX idx_featured_listings_tenant_id ON featured_listings(tenant_id);
CREATE INDEX idx_featured_listings_listing ON featured_listings(listing_id, listing_type);
CREATE INDEX idx_featured_listings_status ON featured_listings(status);
CREATE INDEX idx_featured_listings_placement ON featured_listings(placement);
CREATE INDEX idx_featured_listings_end_date ON featured_listings(end_date);

CREATE INDEX idx_homepage_sections_enabled ON homepage_sections(is_enabled);
CREATE INDEX idx_homepage_featured_section_id ON homepage_featured(section_id);
CREATE INDEX idx_homepage_featured_listing ON homepage_featured(listing_id, listing_type);
CREATE INDEX idx_homepage_featured_tenant_id ON homepage_featured(tenant_id);

CREATE INDEX idx_advertisements_tenant_id ON advertisements(tenant_id);
CREATE INDEX idx_advertisements_status ON advertisements(status);
CREATE INDEX idx_advertisements_ad_type ON advertisements(ad_type);
CREATE INDEX idx_advertisement_clicks_ad_id ON advertisement_clicks(advertisement_id);
CREATE INDEX idx_advertisement_views_ad_id ON advertisement_views(advertisement_id);

CREATE INDEX idx_promotion_payments_promotion_id ON promotion_payments(vendor_promotion_id);
CREATE INDEX idx_promotion_payments_tenant_id ON promotion_payments(tenant_id);
CREATE INDEX idx_promotion_invoices_tenant_id ON promotion_invoices(tenant_id);
CREATE INDEX idx_promotion_invoices_promotion_id ON promotion_invoices(vendor_promotion_id);
CREATE INDEX idx_promotion_analytics_promotion_id ON promotion_analytics(vendor_promotion_id);
CREATE INDEX idx_promotion_analytics_date ON promotion_analytics(date);

CREATE INDEX idx_destination_pages_country ON destination_pages(country);
CREATE INDEX idx_destination_pages_published ON destination_pages(is_published);
CREATE INDEX idx_destination_galleries_page_id ON destination_galleries(destination_page_id);

CREATE INDEX idx_vendor_badges_tenant_id ON vendor_badges(tenant_id);
CREATE INDEX idx_vendor_awards_tenant_id ON vendor_awards(tenant_id);

CREATE INDEX idx_review_reports_review_id ON review_reports(review_id);
CREATE INDEX idx_review_reports_status ON review_reports(status);
CREATE INDEX idx_review_votes_review_id ON review_votes(review_id);

CREATE INDEX idx_listing_rankings_listing ON listing_rankings(listing_id, listing_type);
CREATE INDEX idx_listing_rankings_total_score ON listing_rankings(total_score DESC);
CREATE INDEX idx_search_scores_listing ON search_scores(listing_id, listing_type);

CREATE INDEX idx_promotion_events_tenant_id ON promotion_events(tenant_id);
CREATE INDEX idx_promotion_events_is_read ON promotion_events(is_read);

-- ============================================
-- PAYMENTS TABLE — link to vendor_promotions
-- ============================================
-- Non-invasive addition: reuses the existing payment_service pipeline for
-- promotion purchases (same providers, same webhook path) instead of a
-- parallel payment system.

ALTER TABLE payments ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES vendor_promotions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_payments_promotion_id ON payments(promotion_id);

-- ============================================
-- TRIGGERS — updated_at maintenance
-- ============================================

CREATE TRIGGER update_promotion_packages_updated_at BEFORE UPDATE ON promotion_packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_promotions_updated_at BEFORE UPDATE ON vendor_promotions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_featured_listings_updated_at BEFORE UPDATE ON featured_listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_homepage_sections_updated_at BEFORE UPDATE ON homepage_sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advertisements_updated_at BEFORE UPDATE ON advertisements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotion_payments_updated_at BEFORE UPDATE ON promotion_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_destination_pages_updated_at BEFORE UPDATE ON destination_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_public_profiles_updated_at BEFORE UPDATE ON vendor_public_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Promotion invoice number generator (mirrors generate_invoice_number, own sequence)
CREATE SEQUENCE promotion_invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_promotion_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := 'PINV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(nextval('promotion_invoice_number_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_promotion_invoice_number_trigger BEFORE INSERT ON promotion_invoices
    FOR EACH ROW EXECUTE FUNCTION generate_promotion_invoice_number();

-- Keep featured_listings.status in sync with expiry without a cron round-trip
-- for reads (cron still does the authoritative sweep — see /api/cron/promotions).
CREATE OR REPLACE FUNCTION touch_promotion_ctr()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.views > 0 THEN
        NEW.ctr := ROUND((NEW.clicks::DECIMAL / NEW.views::DECIMAL), 4);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER touch_promotion_analytics_ctr BEFORE INSERT OR UPDATE ON promotion_analytics
    FOR EACH ROW EXECUTE FUNCTION touch_promotion_ctr();

-- Realtime for vendor-facing live stats
ALTER PUBLICATION supabase_realtime ADD TABLE vendor_promotions;
ALTER PUBLICATION supabase_realtime ADD TABLE advertisements;
ALTER PUBLICATION supabase_realtime ADD TABLE promotion_events;

-- ============================================
-- SEED — default homepage sections + starter promotion packages
-- ============================================

INSERT INTO homepage_sections (key, title, section_type, sort_order, max_listings) VALUES
    ('featured_tours', 'Featured Tours', 'category', 1, 12),
    ('featured_adventures', 'Featured Adventures', 'category', 2, 12),
    ('featured_travel_services', 'Featured Travel Services', 'category', 3, 12),
    ('featured_car_rentals', 'Featured Car Rentals', 'category', 4, 12),
    ('popular_destinations', 'Popular Destinations', 'destination', 5, 8),
    ('trending_this_week', 'Trending This Week', 'trending', 6, 12),
    ('weekend_escapes', 'Weekend Escapes', 'curated', 7, 8),
    ('family_trips', 'Family Trips', 'curated', 8, 8),
    ('luxury_experiences', 'Luxury Experiences', 'curated', 9, 8),
    ('budget_travel', 'Budget Travel', 'curated', 10, 8),
    ('editors_choice', 'Editor''s Choice', 'curated', 11, 8),
    ('top_rated', 'Top Rated', 'ranked', 12, 12),
    ('new_vendors', 'New Vendors', 'ranked', 13, 8),
    ('verified_businesses', 'Verified Businesses', 'ranked', 14, 8),
    ('recently_added', 'Recently Added', 'ranked', 15, 12),
    ('seasonal_campaigns', 'Seasonal Campaigns', 'seasonal', 16, 8)
ON CONFLICT (key) DO NOTHING;

INSERT INTO promotion_packages (name, slug, promotion_type, placement, description, price, currency, billing_cycle, duration_days) VALUES
    ('Homepage Feature — 7 Days', 'homepage-feature-7d', 'homepage_featured', 'homepage', 'Feature a listing on the homepage for 7 days.', 2500, 'KES', 'fixed', 7),
    ('Homepage Feature — 30 Days', 'homepage-feature-30d', 'homepage_featured', 'homepage', 'Feature a listing on the homepage for 30 days.', 8000, 'KES', 'fixed', 30),
    ('Sponsored Listing — 7 Days', 'sponsored-listing-7d', 'sponsored_listing', 'search', 'Boost a listing to the top of search results for 7 days.', 1800, 'KES', 'fixed', 7),
    ('Sponsored Listing — 30 Days', 'sponsored-listing-30d', 'sponsored_listing', 'search', 'Boost a listing to the top of search results for 30 days.', 6000, 'KES', 'fixed', 30),
    ('Premium Badge — 30 Days', 'premium-badge-30d', 'premium_badge', NULL, 'Display a premium badge on your profile and listings for 30 days.', 3000, 'KES', 'fixed', 30),
    ('Category Featured — 14 Days', 'category-featured-14d', 'category_featured', 'category', 'Feature a listing at the top of its category for 14 days.', 3500, 'KES', 'fixed', 14),
    ('Destination Featured — 14 Days', 'destination-featured-14d', 'destination_featured', 'destination', 'Feature a listing on its destination page for 14 days.', 3500, 'KES', 'fixed', 14),
    ('Homepage Banner — Weekly', 'homepage-banner-weekly', 'banner_advertisement', 'homepage', 'Run a homepage banner advertisement, billed weekly.', 5000, 'KES', 'weekly', 7),
    ('Newsletter Promotion — Single Send', 'newsletter-promotion-single', 'newsletter_promotion', 'newsletter', 'Include your listing in the next vendor newsletter send.', 2000, 'KES', 'fixed', 1)
ON CONFLICT (slug) DO NOTHING;
