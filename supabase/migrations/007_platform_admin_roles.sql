-- 007: Platform admin roles
--
-- Splits the single "platform admin" concept (role = 'owner' AND tenant_id IS NULL)
-- into 4 distinct portals with separate logins:
--   super_admin    - full platform control (everything below)
--   kyc_admin      - vendor KYC verification only
--   finance_admin  - payments, refunds, provider settings, subscriptions
--   support_admin  - support tickets, review reports/moderation
--
-- A platform admin row is still identified the same way at the DB level
-- (role = 'owner' AND tenant_id IS NULL) -- that invariant doesn't change.
-- platform_admin_role narrows WHICH portal that row is allowed to act as.
--
-- RLS is the real trust boundary (see README), so every "Platform admins can ..."
-- policy that existed before this migration is replaced with a scoped version.
-- super_admin always has the union of everything the other 3 roles can do.

-- ============================================
-- ENUM + COLUMN
-- ============================================

CREATE TYPE platform_admin_role AS ENUM ('super_admin', 'kyc_admin', 'finance_admin', 'support_admin');

ALTER TABLE users ADD COLUMN platform_admin_role platform_admin_role;

-- Backfill: every existing platform admin becomes a super_admin so nobody is locked out.
UPDATE users
SET platform_admin_role = 'super_admin'
WHERE tenant_id IS NULL
  AND role = 'owner'
  AND platform_admin_role IS NULL;

-- platform_admin_role only makes sense on platform-admin rows.
ALTER TABLE users ADD CONSTRAINT users_platform_admin_role_scope_check
    CHECK (
        platform_admin_role IS NULL
        OR (tenant_id IS NULL AND role = 'owner')
    );

CREATE INDEX idx_users_platform_admin_role ON users(platform_admin_role)
    WHERE platform_admin_role IS NOT NULL;

-- ============================================
-- TENANTS -- super_admin (broad) + kyc_admin (verification review)
-- ============================================

DROP POLICY IF EXISTS "Platform admins can read all tenants" ON tenants;
CREATE POLICY "Platform admins can read all tenants" ON tenants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'owner'
            AND users.tenant_id IS NULL
            AND users.platform_admin_role IN ('super_admin', 'kyc_admin')
        )
    );

-- ============================================
-- USERS -- super_admin only
-- ============================================

DROP POLICY IF EXISTS "Platform admins can read all users" ON users;
CREATE POLICY "Platform admins can read all users" ON users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'owner'
            AND u.tenant_id IS NULL
            AND u.platform_admin_role = 'super_admin'
        )
    );

-- ============================================
-- BOOKINGS -- super_admin only
-- ============================================

DROP POLICY IF EXISTS "Platform admins can read all bookings" ON bookings;
CREATE POLICY "Platform admins can read all bookings" ON bookings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'owner'
            AND users.tenant_id IS NULL
            AND users.platform_admin_role = 'super_admin'
        )
    );

-- ============================================
-- CONVERSATIONS -- super_admin only
-- ============================================

DROP POLICY IF EXISTS "Platform admins can read all conversations" ON conversations;
CREATE POLICY "Platform admins can read all conversations" ON conversations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'owner'
            AND users.tenant_id IS NULL
            AND users.platform_admin_role = 'super_admin'
        )
    );

-- ============================================
-- SUPPORT TICKETS -- super_admin + support_admin
-- ============================================

DROP POLICY IF EXISTS "Platform admins can read all support tickets" ON support_tickets;
CREATE POLICY "Platform admins can read all support tickets" ON support_tickets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'owner'
            AND users.tenant_id IS NULL
            AND users.platform_admin_role IN ('super_admin', 'support_admin')
        )
    );

DROP POLICY IF EXISTS "Staff can update support tickets" ON support_tickets;
CREATE POLICY "Staff can update support tickets" ON support_tickets
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (
                (users.role = 'owner' AND users.tenant_id IS NULL AND users.platform_admin_role IN ('super_admin', 'support_admin'))
                OR users.tenant_id = support_tickets.tenant_id
            )
        )
    );

-- ============================================
-- SUBSCRIPTIONS -- super_admin + finance_admin
-- ============================================

DROP POLICY IF EXISTS "Platform admins can read all subscriptions" ON subscriptions;
CREATE POLICY "Platform admins can read all subscriptions" ON subscriptions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'owner'
            AND users.tenant_id IS NULL
            AND users.platform_admin_role IN ('super_admin', 'finance_admin')
        )
    );

-- ============================================
-- PAYMENTS -- super_admin + finance_admin
-- ============================================

DROP POLICY IF EXISTS "Platform admins can read all payments" ON payments;
CREATE POLICY "Platform admins can read all payments" ON payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'owner'
            AND users.tenant_id IS NULL
            AND users.platform_admin_role IN ('super_admin', 'finance_admin')
        )
    );

-- ============================================
-- AUDIT LOGS -- super_admin only
-- ============================================

DROP POLICY IF EXISTS "Platform admins can read all audit logs" ON audit_logs;
CREATE POLICY "Platform admins can read all audit logs" ON audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'owner'
            AND users.tenant_id IS NULL
            AND users.platform_admin_role = 'super_admin'
        )
    );

-- ============================================
-- KYC VERIFICATIONS -- super_admin + kyc_admin
-- ============================================

DROP POLICY IF EXISTS "Platform admins can read all kyc verifications" ON kyc_verifications;
CREATE POLICY "Platform admins can read all kyc verifications" ON kyc_verifications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'owner'
            AND users.tenant_id IS NULL
            AND users.platform_admin_role IN ('super_admin', 'kyc_admin')
        )
    );

-- kyc_admin and super_admin can act on verifications (approve/reject), not just read
CREATE POLICY "Platform admins can update kyc verifications" ON kyc_verifications
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'owner'
            AND users.tenant_id IS NULL
            AND users.platform_admin_role IN ('super_admin', 'kyc_admin')
        )
    );

-- kyc_admin and super_admin can update the tenant verification fields (approve/reject a vendor)
CREATE POLICY "Platform admins can update tenant verification" ON tenants
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'owner'
            AND users.tenant_id IS NULL
            AND users.platform_admin_role IN ('super_admin', 'kyc_admin')
        )
    );

-- ============================================
-- AI ASSISTANT LOGS -- super_admin only
-- ============================================

DROP POLICY IF EXISTS "Platform admins can read all ai assistant logs" ON ai_assistant_logs;
CREATE POLICY "Platform admins can read all ai assistant logs" ON ai_assistant_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'owner'
            AND users.tenant_id IS NULL
            AND users.platform_admin_role = 'super_admin'
        )
    );

-- ============================================
-- PAYMENT PROVIDER SETTINGS -- super_admin + finance_admin
-- ============================================

DROP POLICY IF EXISTS "Platform admins can read payment provider settings" ON payment_provider_settings;
CREATE POLICY "Platform admins can read payment provider settings" ON payment_provider_settings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id IS NULL
            AND users.role = 'owner'
            AND users.platform_admin_role IN ('super_admin', 'finance_admin')
        )
    );

CREATE POLICY "Platform admins can update payment provider settings" ON payment_provider_settings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id IS NULL
            AND users.role = 'owner'
            AND users.platform_admin_role IN ('super_admin', 'finance_admin')
        )
    );

-- ============================================
-- PAYMENT REFUNDS -- super_admin + finance_admin
-- ============================================

DROP POLICY IF EXISTS "Platform admins can read all refunds" ON payment_refunds;
CREATE POLICY "Platform admins can read all refunds" ON payment_refunds
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id IS NULL
            AND users.role = 'owner'
            AND users.platform_admin_role IN ('super_admin', 'finance_admin')
        )
    );

CREATE POLICY "Platform admins can create refunds" ON payment_refunds
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id IS NULL
            AND users.role = 'owner'
            AND users.platform_admin_role IN ('super_admin', 'finance_admin')
        )
    );

-- ============================================
-- VENDOR PROMOTIONS / HOMEPAGE / ADVERTISEMENTS / DESTINATION PAGES -- super_admin only
-- (not delegated to any of the 3 specialist roles)
-- ============================================

DROP POLICY IF EXISTS "Platform admins can read all vendor promotions" ON vendor_promotions;
CREATE POLICY "Platform admins can read all vendor promotions" ON vendor_promotions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'owner' AND users.tenant_id IS NULL AND users.platform_admin_role = 'super_admin')
    );

DROP POLICY IF EXISTS "Platform admins can manage homepage sections" ON homepage_sections;
CREATE POLICY "Platform admins can manage homepage sections" ON homepage_sections
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'owner' AND users.tenant_id IS NULL AND users.platform_admin_role = 'super_admin')
    );

DROP POLICY IF EXISTS "Platform admins can read all advertisements" ON advertisements;
CREATE POLICY "Platform admins can read all advertisements" ON advertisements
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'owner' AND users.tenant_id IS NULL AND users.platform_admin_role = 'super_admin')
    );

DROP POLICY IF EXISTS "Platform admins can manage destination pages" ON destination_pages;
CREATE POLICY "Platform admins can manage destination pages" ON destination_pages
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'owner' AND users.tenant_id IS NULL AND users.platform_admin_role = 'super_admin')
    );

-- ============================================
-- REVIEW REPORTS -- super_admin + support_admin
-- ============================================

DROP POLICY IF EXISTS "Platform admins can read all review reports" ON review_reports;
CREATE POLICY "Platform admins can read all review reports" ON review_reports
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'owner' AND users.tenant_id IS NULL AND users.platform_admin_role IN ('super_admin', 'support_admin'))
    );

CREATE POLICY "Platform admins can update review reports" ON review_reports
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'owner' AND users.tenant_id IS NULL AND users.platform_admin_role IN ('super_admin', 'support_admin'))
    );
