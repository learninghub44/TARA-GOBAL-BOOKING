-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE adventure_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_assistant_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TENANTS RLS POLICIES
-- ============================================

-- Service role can do everything
CREATE POLICY "Service role can manage tenants" ON tenants
    FOR ALL
    USING (auth.role() = 'service_role');

-- Platform admins can read all tenants
CREATE POLICY "Platform admins can read all tenants" ON tenants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'owner'
            AND users.tenant_id IS NULL
        )
    );

-- Tenant owners/managers can read their own tenant
CREATE POLICY "Tenant users can read own tenant" ON tenants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = tenants.id
        )
    );

-- ============================================
-- USERS RLS POLICIES
-- ============================================

-- Service role can do everything
CREATE POLICY "Service role can manage users" ON users
    FOR ALL
    USING (auth.role() = 'service_role');

-- Platform admins can read all users
CREATE POLICY "Platform admins can read all users" ON users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'owner'
            AND users.tenant_id IS NULL
        )
    );

-- Tenant owners/managers can read their tenant's users
CREATE POLICY "Tenant owners/managers can read tenant users" ON users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = users.tenant_id
            AND users.role IN ('owner', 'manager')
        )
    );

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
    FOR SELECT
    USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE
    USING (id = auth.uid());

-- ============================================
-- TOURS RLS POLICIES
-- ============================================

-- Service role can do everything
CREATE POLICY "Service role can manage tours" ON tours
    FOR ALL
    USING (auth.role() = 'service_role');

-- Public can read active tours
CREATE POLICY "Public can read active tours" ON tours
    FOR SELECT
    USING (is_active = true AND listing_status = 'active');

-- Tenant users can read their tenant's tours
CREATE POLICY "Tenant users can read own tours" ON tours
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = tours.tenant_id
        )
    );

-- Tenant owners/managers/staff can insert tours for their tenant
CREATE POLICY "Tenant staff can insert tours" ON tours
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = tours.tenant_id
            AND users.role IN ('owner', 'manager', 'staff')
        )
    );

-- Tenant owners/managers/staff can update their tenant's tours
CREATE POLICY "Tenant staff can update tours" ON tours
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = tours.tenant_id
            AND users.role IN ('owner', 'manager', 'staff')
        )
    );

-- Tenant owners/managers can delete their tenant's tours
CREATE POLICY "Tenant owners/managers can delete tours" ON tours
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = tours.tenant_id
            AND users.role IN ('owner', 'manager')
        )
    );

-- ============================================
-- TRAVEL SERVICES RLS POLICIES
-- ============================================

-- Service role can do everything
CREATE POLICY "Service role can manage travel services" ON travel_services
    FOR ALL
    USING (auth.role() = 'service_role');

-- Public can read active travel services
CREATE POLICY "Public can read active travel services" ON travel_services
    FOR SELECT
    USING (is_active = true AND listing_status = 'active');

-- Tenant users can read their tenant's travel services
CREATE POLICY "Tenant users can read own travel services" ON travel_services
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = travel_services.tenant_id
        )
    );

-- Tenant staff can insert travel services for their tenant
CREATE POLICY "Tenant staff can insert travel services" ON travel_services
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = travel_services.tenant_id
            AND users.role IN ('owner', 'manager', 'staff')
        )
    );

-- Tenant staff can update their tenant's travel services
CREATE POLICY "Tenant staff can update travel services" ON travel_services
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = travel_services.tenant_id
            AND users.role IN ('owner', 'manager', 'staff')
        )
    );

-- Tenant owners/managers can delete their tenant's travel services
CREATE POLICY "Tenant owners/managers can delete travel services" ON travel_services
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = travel_services.tenant_id
            AND users.role IN ('owner', 'manager')
        )
    );

-- ============================================
-- CAR RENTALS RLS POLICIES
-- ============================================

-- Service role can do everything
CREATE POLICY "Service role can manage car rentals" ON car_rentals
    FOR ALL
    USING (auth.role() = 'service_role');

-- Public can read active car rentals
CREATE POLICY "Public can read active car rentals" ON car_rentals
    FOR SELECT
    USING (is_active = true AND listing_status = 'active');

-- Tenant users can read their tenant's car rentals
CREATE POLICY "Tenant users can read own car rentals" ON car_rentals
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = car_rentals.tenant_id
        )
    );

-- Tenant staff can insert car rentals for their tenant
CREATE POLICY "Tenant staff can insert car rentals" ON car_rentals
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = car_rentals.tenant_id
            AND users.role IN ('owner', 'manager', 'staff')
        )
    );

-- Tenant staff can update their tenant's car rentals
CREATE POLICY "Tenant staff can update car rentals" ON car_rentals
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = car_rentals.tenant_id
            AND users.role IN ('owner', 'manager', 'staff')
        )
    );

-- Tenant owners/managers can delete their tenant's car rentals
CREATE POLICY "Tenant owners/managers can delete car rentals" ON car_rentals
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = car_rentals.tenant_id
            AND users.role IN ('owner', 'manager')
        )
    );

-- ============================================
-- ADVENTURE ACTIVITIES RLS POLICIES
-- ============================================

-- Service role can do everything
CREATE POLICY "Service role can manage adventure activities" ON adventure_activities
    FOR ALL
    USING (auth.role() = 'service_role');

-- Public can read active adventure activities
CREATE POLICY "Public can read active adventure activities" ON adventure_activities
    FOR SELECT
    USING (is_active = true AND listing_status = 'active');

-- Tenant users can read their tenant's adventure activities
CREATE POLICY "Tenant users can read own adventure activities" ON adventure_activities
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = adventure_activities.tenant_id
        )
    );

-- Tenant staff can insert adventure activities for their tenant
CREATE POLICY "Tenant staff can insert adventure activities" ON adventure_activities
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = adventure_activities.tenant_id
            AND users.role IN ('owner', 'manager', 'staff')
        )
    );

-- Tenant staff can update their tenant's adventure activities
CREATE POLICY "Tenant staff can update adventure activities" ON adventure_activities
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = adventure_activities.tenant_id
            AND users.role IN ('owner', 'manager', 'staff')
        )
    );

-- Tenant owners/managers can delete their tenant's adventure activities
CREATE POLICY "Tenant owners/managers can delete adventure activities" ON adventure_activities
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = adventure_activities.tenant_id
            AND users.role IN ('owner', 'manager')
        )
    );

-- ============================================
-- BOOKINGS RLS POLICIES
-- ============================================

-- Service role can do everything
CREATE POLICY "Service role can manage bookings" ON bookings
    FOR ALL
    USING (auth.role() = 'service_role');

-- Platform admins can read all bookings
CREATE POLICY "Platform admins can read all bookings" ON bookings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'owner'
            AND users.tenant_id IS NULL
        )
    );

-- Tenant users can read their tenant's bookings
CREATE POLICY "Tenant users can read own bookings" ON bookings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = bookings.tenant_id
        )
    );

-- Customers can read their own bookings by email
CREATE POLICY "Customers can read own bookings" ON bookings
    FOR SELECT
    USING (customer_email = (SELECT email FROM users WHERE id = auth.uid()));

-- Tenant staff can insert bookings for their tenant
CREATE POLICY "Tenant staff can insert bookings" ON bookings
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = bookings.tenant_id
            AND users.role IN ('owner', 'manager', 'staff', 'sales_agent')
        )
    );

-- Tenant staff can update their tenant's bookings
CREATE POLICY "Tenant staff can update bookings" ON bookings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = bookings.tenant_id
            AND users.role IN ('owner', 'manager', 'staff', 'sales_agent')
        )
    );

-- ============================================
-- CONVERSATIONS RLS POLICIES
-- ============================================

-- Service role can do everything
CREATE POLICY "Service role can manage conversations" ON conversations
    FOR ALL
    USING (auth.role() = 'service_role');

-- Platform admins can read all conversations
CREATE POLICY "Platform admins can read all conversations" ON conversations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'owner'
            AND users.tenant_id IS NULL
        )
    );

-- Tenant staff can read their tenant's conversations
CREATE POLICY "Tenant staff can read own conversations" ON conversations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = conversations.tenant_id
            AND users.role IN ('owner', 'manager', 'staff', 'customer_support')
        )
    );

-- Tenant staff can insert conversations for their tenant
CREATE POLICY "Tenant staff can insert conversations" ON conversations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = conversations.tenant_id
            AND users.role IN ('owner', 'manager', 'staff', 'customer_support')
        )
    );

-- Tenant staff can update their tenant's conversations
CREATE POLICY "Tenant staff can update conversations" ON conversations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = conversations.tenant_id
            AND users.role IN ('owner', 'manager', 'staff', 'customer_support')
        )
    );

-- ============================================
-- MESSAGES RLS POLICIES
-- ============================================

-- Service role can do everything
CREATE POLICY "Service role can manage messages" ON messages
    FOR ALL
    USING (auth.role() = 'service_role');

-- Users can read messages in conversations they have access to
CREATE POLICY "Users can read conversation messages" ON messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND (
                conversations.tenant_id IN (
                    SELECT users.tenant_id FROM users WHERE users.id = auth.uid()
                )
                OR conversations.customer_id = auth.uid()
            )
        )
    );

-- Users can insert messages in conversations they have access to
CREATE POLICY "Users can insert messages" ON messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND (
                conversations.tenant_id IN (
                    SELECT users.tenant_id FROM users WHERE users.id = auth.uid()
                )
                OR conversations.customer_id = auth.uid()
            )
        )
    );

-- ============================================
-- REVIEWS RLS POLICIES
-- ============================================

-- Service role can do everything
CREATE POLICY "Service role can manage reviews" ON reviews
    FOR ALL
    USING (auth.role() = 'service_role');

-- Public can read approved reviews
CREATE POLICY "Public can read approved reviews" ON reviews
    FOR SELECT
    USING (is_approved = true);

-- Tenant users can read their tenant's reviews
CREATE POLICY "Tenant users can read own reviews" ON reviews
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = reviews.tenant_id
        )
    );

-- Users can read their own reviews
CREATE POLICY "Users can read own reviews" ON reviews
    FOR SELECT
    USING (customer_email = (SELECT email FROM users WHERE id = auth.uid()));

-- Users can insert reviews
CREATE POLICY "Users can insert reviews" ON reviews
    FOR INSERT
    WITH CHECK (customer_email = (SELECT email FROM users WHERE id = auth.uid()));

-- ============================================
-- SUPPORT TICKETS RLS POLICIES
-- ============================================

-- Service role can do everything
CREATE POLICY "Service role can manage support tickets" ON support_tickets
    FOR ALL
    USING (auth.role() = 'service_role');

-- Platform admins can read all support tickets
CREATE POLICY "Platform admins can read all support tickets" ON support_tickets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'owner'
            AND users.tenant_id IS NULL
        )
    );

-- Tenant users can read their tenant's support tickets
CREATE POLICY "Tenant users can read own support tickets" ON support_tickets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = support_tickets.tenant_id
        )
    );

-- Users can read their own support tickets
CREATE POLICY "Users can read own support tickets" ON support_tickets
    FOR SELECT
    USING (user_id = auth.uid());

-- Users can insert support tickets
CREATE POLICY "Users can insert support tickets" ON support_tickets
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Platform admins and tenant staff can update support tickets
CREATE POLICY "Staff can update support tickets" ON support_tickets
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (
                (users.role = 'owner' AND users.tenant_id IS NULL)
                OR users.tenant_id = support_tickets.tenant_id
            )
        )
    );

-- ============================================
-- SUBSCRIPTIONS RLS POLICIES
-- ============================================

-- Service role can do everything
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
    FOR ALL
    USING (auth.role() = 'service_role');

-- Platform admins can read all subscriptions
CREATE POLICY "Platform admins can read all subscriptions" ON subscriptions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'owner'
            AND users.tenant_id IS NULL
        )
    );

-- Tenant users can read their tenant's subscriptions
CREATE POLICY "Tenant users can read own subscriptions" ON subscriptions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = subscriptions.tenant_id
        )
    );

-- ============================================
-- PAYMENTS RLS POLICIES
-- ============================================

-- Service role can do everything
CREATE POLICY "Service role can manage payments" ON payments
    FOR ALL
    USING (auth.role() = 'service_role');

-- Platform admins can read all payments
CREATE POLICY "Platform admins can read all payments" ON payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'owner'
            AND users.tenant_id IS NULL
        )
    );

-- Tenant users can read their tenant's payments
CREATE POLICY "Tenant users can read own payments" ON payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = payments.tenant_id
        )
    );

-- ============================================
-- PAYMENT WEBHOOKS RLS POLICIES
-- ============================================

-- Service role can do everything
CREATE POLICY "Service role can manage payment webhooks" ON payment_webhooks
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================
-- AUDIT LOGS RLS POLICIES
-- ============================================

-- Service role can do everything
CREATE POLICY "Service role can manage audit logs" ON audit_logs
    FOR ALL
    USING (auth.role() = 'service_role');

-- Platform admins can read all audit logs
CREATE POLICY "Platform admins can read all audit logs" ON audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'owner'
            AND users.tenant_id IS NULL
        )
    );

-- Tenant users can read their tenant's audit logs
CREATE POLICY "Tenant users can read own audit logs" ON audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = audit_logs.tenant_id
        )
    );

-- ============================================
-- KYC VERIFICATIONS RLS POLICIES
-- ============================================

-- Service role can do everything
CREATE POLICY "Service role can manage kyc verifications" ON kyc_verifications
    FOR ALL
    USING (auth.role() = 'service_role');

-- Platform admins can read all KYC verifications
CREATE POLICY "Platform admins can read all kyc verifications" ON kyc_verifications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'owner'
            AND users.tenant_id IS NULL
        )
    );

-- Tenant users can read their tenant's KYC verifications
CREATE POLICY "Tenant users can read own kyc verifications" ON kyc_verifications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = kyc_verifications.tenant_id
        )
    );

-- ============================================
-- AI ASSISTANT LOGS RLS POLICIES
-- ============================================

-- Service role can do everything
CREATE POLICY "Service role can manage ai assistant logs" ON ai_assistant_logs
    FOR ALL
    USING (auth.role() = 'service_role');

-- Platform admins can read all AI assistant logs
CREATE POLICY "Platform admins can read all ai assistant logs" ON ai_assistant_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'owner'
            AND users.tenant_id IS NULL
        )
    );

-- Users can read their own AI assistant logs
CREATE POLICY "Users can read own ai assistant logs" ON ai_assistant_logs
    FOR SELECT
    USING (user_id = auth.uid());
