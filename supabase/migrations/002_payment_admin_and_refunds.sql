-- ============================================
-- 002: Payment provider admin config, refunds,
-- retry tracking, subscription reminders
-- ============================================

-- ============================================
-- PAYMENT PROVIDER SETTINGS
-- ============================================
-- API credentials stay in environment variables (never stored in the DB).
-- This table controls which providers are enabled, which one is the
-- default, and the fallback order — all editable from the admin panel
-- without a code deploy.

CREATE TABLE payment_provider_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider payment_provider UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    priority INTEGER NOT NULL DEFAULT 0, -- lower = tried first in fallback chain
    notes TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_payment_provider_settings_updated_at BEFORE UPDATE ON payment_provider_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Only one default provider at a time
CREATE UNIQUE INDEX idx_payment_provider_settings_single_default
    ON payment_provider_settings (is_default)
    WHERE is_default = TRUE;

INSERT INTO payment_provider_settings (provider, display_name, is_enabled, is_default, priority) VALUES
    ('paystack', 'Paystack', TRUE, TRUE, 0),
    ('pesapal', 'Pesapal', TRUE, FALSE, 1),
    ('mpesa', 'M-Pesa (Daraja)', TRUE, FALSE, 2);

-- ============================================
-- PAYMENT REFUNDS
-- ============================================

CREATE TYPE refund_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'manual_required');

CREATE TABLE payment_refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    reason TEXT,
    status refund_status DEFAULT 'pending',
    provider_refund_id VARCHAR(255),
    provider_response JSONB,
    initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_payment_refunds_updated_at BEFORE UPDATE ON payment_refunds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_payment_refunds_payment_id ON payment_refunds(payment_id);
CREATE INDEX idx_payment_refunds_tenant_id ON payment_refunds(tenant_id);
CREATE INDEX idx_payment_refunds_status ON payment_refunds(status);

-- ============================================
-- PAYMENTS: retry + refund tracking columns
-- ============================================

ALTER TABLE payments ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN last_retry_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payments ADD COLUMN refunded_amount DECIMAL(12, 2) NOT NULL DEFAULT 0;

CREATE INDEX idx_payments_pending_reconcile ON payments(status, created_at) WHERE status = 'pending';

-- ============================================
-- SUBSCRIPTIONS: renewal reminder tracking
-- ============================================

ALTER TABLE subscriptions ADD COLUMN reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- RLS
-- ============================================

ALTER TABLE payment_provider_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage payment provider settings" ON payment_provider_settings
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Platform admins can read payment provider settings" ON payment_provider_settings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id IS NULL
            AND users.role = 'owner'
        )
    );

CREATE POLICY "Service role can manage payment refunds" ON payment_refunds
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Platform admins can read all refunds" ON payment_refunds
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id IS NULL
            AND users.role = 'owner'
        )
    );

CREATE POLICY "Tenant users can read own refunds" ON payment_refunds
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = payment_refunds.tenant_id
        )
    );
