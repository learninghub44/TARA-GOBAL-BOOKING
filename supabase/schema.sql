-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('owner', 'manager', 'staff', 'sales_agent', 'customer_support');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected', 'manual_review');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'past_due', 'cancelled', 'expired');
CREATE TYPE subscription_plan AS ENUM ('monthly', 'quarterly', 'annual');
CREATE TYPE payment_provider AS ENUM ('paystack', 'pesapal', 'mpesa');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE ticket_category AS ENUM ('technical', 'billing', 'account', 'kyc', 'booking', 'feature_request', 'other');
CREATE TYPE message_type AS ENUM ('text', 'image', 'document', 'system');
CREATE TYPE listing_type AS ENUM ('tour', 'travel_service', 'car_rental', 'adventure');
CREATE TYPE listing_status AS ENUM ('draft', 'active', 'inactive', 'suspended');
CREATE TYPE vehicle_type AS ENUM ('sedan', 'suv', 'van', 'bus', 'motorcycle', 'bicycle', 'other');
CREATE TYPE transmission_type AS ENUM ('automatic', 'manual');
CREATE TYPE fuel_type AS ENUM ('petrol', 'diesel', 'electric', 'hybrid');

-- ============================================
-- TENANTS TABLE
-- ============================================

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name VARCHAR(255) NOT NULL,
    business_slug VARCHAR(255) UNIQUE NOT NULL,
    business_email VARCHAR(255) NOT NULL,
    business_phone VARCHAR(50),
    business_address TEXT,
    business_city VARCHAR(100),
    business_country VARCHAR(100) NOT NULL,
    business_logo_url TEXT,
    business_banner_url TEXT,
    business_description TEXT,
    website_url VARCHAR(500),
    registration_number VARCHAR(100),
    tax_id VARCHAR(100),
    verification_status verification_status DEFAULT 'pending',
    kyc_provider VARCHAR(50),
    kyc_reference_id VARCHAR(255),
    kyc_completed_at TIMESTAMP WITH TIME ZONE,
    kyc_notes TEXT,
    subscription_status subscription_status DEFAULT 'inactive',
    subscription_plan subscription_plan,
    subscription_start_date TIMESTAMP WITH TIME ZONE,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_sponsored BOOLEAN DEFAULT FALSE,
    featured_until TIMESTAMP WITH TIME ZONE,
    sponsored_until TIMESTAMP WITH TIME ZONE,
    rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_listings INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USERS TABLE
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    profile_image_url TEXT,
    role user_role NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TOURS TABLE
-- ============================================

CREATE TABLE tours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    short_description VARCHAR(500),
    destination_country VARCHAR(100) NOT NULL,
    destination_city VARCHAR(100),
    destination_address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    duration_days INTEGER NOT NULL,
    duration_hours INTEGER,
    max_group_size INTEGER,
    min_group_size INTEGER DEFAULT 1,
    difficulty_level VARCHAR(50),
    age_requirement VARCHAR(50),
    included_services TEXT[],
    excluded_services TEXT[],
    requirements TEXT[],
    highlights TEXT[],
    itinerary JSONB,
    primary_image_url TEXT,
    gallery_urls TEXT[],
    video_url TEXT,
    base_price DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    price_per_person BOOLEAN DEFAULT TRUE,
    discount_percentage INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT FALSE,
    listing_status listing_status DEFAULT 'draft',
    available_from TIMESTAMP WITH TIME ZONE,
    available_until TIMESTAMP WITH TIME ZONE,
    booking_cutoff_hours INTEGER DEFAULT 24,
    cancellation_policy TEXT,
    terms_and_conditions TEXT,
    rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT tours_tenant_id_check CHECK (tenant_id IS NOT NULL)
);

-- ============================================
-- TRAVEL SERVICES TABLE
-- ============================================

CREATE TABLE travel_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    short_description VARCHAR(500),
    service_type VARCHAR(100) NOT NULL,
    destination_country VARCHAR(100) NOT NULL,
    destination_city VARCHAR(100),
    destination_address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    primary_image_url TEXT,
    gallery_urls TEXT[],
    video_url TEXT,
    base_price DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    price_per_unit VARCHAR(50),
    discount_percentage INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT FALSE,
    listing_status listing_status DEFAULT 'draft',
    available_from TIMESTAMP WITH TIME ZONE,
    available_until TIMESTAMP WITH TIME ZONE,
    booking_cutoff_hours INTEGER DEFAULT 24,
    cancellation_policy TEXT,
    terms_and_conditions TEXT,
    rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT travel_services_tenant_id_check CHECK (tenant_id IS NOT NULL)
);

-- ============================================
-- CAR RENTALS TABLE
-- ============================================

CREATE TABLE car_rentals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    short_description VARCHAR(500),
    vehicle_type vehicle_type NOT NULL,
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    color VARCHAR(50),
    license_plate VARCHAR(50),
    seating_capacity INTEGER,
    luggage_capacity INTEGER,
    transmission_type transmission_type,
    fuel_type fuel_type,
    mileage_per_km DECIMAL(8, 2),
    features TEXT[],
    location_country VARCHAR(100) NOT NULL,
    location_city VARCHAR(100),
    location_address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    pickup_location TEXT,
    dropoff_location TEXT,
    primary_image_url TEXT,
    gallery_urls TEXT[],
    video_url TEXT,
    daily_rate DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    weekly_rate DECIMAL(12, 2),
    monthly_rate DECIMAL(12, 2),
    discount_percentage INTEGER DEFAULT 0,
    minimum_rental_days INTEGER DEFAULT 1,
    maximum_rental_days INTEGER,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT FALSE,
    listing_status listing_status DEFAULT 'draft',
    available_from TIMESTAMP WITH TIME ZONE,
    available_until TIMESTAMP WITH TIME ZONE,
    booking_cutoff_hours INTEGER DEFAULT 24,
    insurance_included BOOLEAN DEFAULT FALSE,
    insurance_details TEXT,
    cancellation_policy TEXT,
    terms_and_conditions TEXT,
    rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT car_rentals_tenant_id_check CHECK (tenant_id IS NOT NULL)
);

-- ============================================
-- ADVENTURE ACTIVITIES TABLE
-- ============================================

CREATE TABLE adventure_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    short_description VARCHAR(500),
    activity_type VARCHAR(100) NOT NULL,
    difficulty_level VARCHAR(50),
    duration_hours INTEGER,
    duration_minutes INTEGER,
    location_country VARCHAR(100) NOT NULL,
    location_city VARCHAR(100),
    location_address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    requirements TEXT[],
    equipment_provided TEXT[],
    equipment_required TEXT[],
    safety_measures TEXT[],
    primary_image_url TEXT,
    gallery_urls TEXT[],
    video_url TEXT,
    base_price DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    price_per_person BOOLEAN DEFAULT TRUE,
    group_size_minimum INTEGER DEFAULT 1,
    group_size_maximum INTEGER,
    age_requirement VARCHAR(50),
    weight_requirement VARCHAR(50),
    height_requirement VARCHAR(50),
    discount_percentage INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT FALSE,
    listing_status listing_status DEFAULT 'draft',
    available_from TIMESTAMP WITH TIME ZONE,
    available_until TIMESTAMP WITH TIME ZONE,
    booking_cutoff_hours INTEGER DEFAULT 24,
    cancellation_policy TEXT,
    terms_and_conditions TEXT,
    rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT adventure_activities_tenant_id_check CHECK (tenant_id IS NOT NULL)
);

-- ============================================
-- BOOKINGS TABLE
-- ============================================

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL,
    listing_type listing_type NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    booking_date TIMESTAMP WITH TIME ZONE NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    number_of_participants INTEGER DEFAULT 1,
    total_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status booking_status DEFAULT 'pending',
    special_requests TEXT,
    notes TEXT,
    payment_method VARCHAR(100),
    payment_reference VARCHAR(255),
    payment_status payment_status DEFAULT 'pending',
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_fee DECIMAL(12, 2),
    refund_amount DECIMAL(12, 2),
    refund_status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT bookings_tenant_id_check CHECK (tenant_id IS NOT NULL)
);

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
    listing_id UUID,
    listing_type listing_type,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    subject VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT conversations_tenant_id_check CHECK (tenant_id IS NOT NULL)
);

-- ============================================
-- MESSAGES TABLE
-- ============================================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID,
    sender_name VARCHAR(255),
    sender_type VARCHAR(50) NOT NULL,
    message_type message_type DEFAULT 'text',
    content TEXT NOT NULL,
    attachment_url TEXT,
    attachment_name VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- REVIEWS TABLE
-- ============================================

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL,
    listing_type listing_type NOT NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT reviews_tenant_id_check CHECK (tenant_id IS NOT NULL)
);

-- ============================================
-- SUPPORT TICKETS TABLE
-- ============================================

CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    priority ticket_priority DEFAULT 'medium',
    category ticket_category NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status ticket_status DEFAULT 'open',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    ai_conversation_summary TEXT,
    internal_notes TEXT,
    attachment_urls TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan subscription_plan NOT NULL,
    status subscription_status DEFAULT 'inactive',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT TRUE,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    features JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT subscriptions_tenant_id_check CHECK (tenant_id IS NOT NULL)
);

-- ============================================
-- PAYMENTS TABLE
-- ============================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_reference VARCHAR(255) UNIQUE NOT NULL,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    business_id UUID NOT NULL,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    payment_provider payment_provider NOT NULL,
    payment_method VARCHAR(100),
    currency VARCHAR(3) DEFAULT 'USD',
    amount DECIMAL(12, 2) NOT NULL,
    status payment_status DEFAULT 'pending',
    verification_status verification_status DEFAULT 'pending',
    provider_transaction_id VARCHAR(255),
    provider_response JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT payments_tenant_id_check CHECK (tenant_id IS NOT NULL)
);

-- ============================================
-- PAYMENT WEBHOOKS TABLE
-- ============================================

CREATE TABLE payment_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    provider payment_provider NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- KYC VERIFICATIONS TABLE
-- ============================================

CREATE TABLE kyc_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_reference_id VARCHAR(255),
    status verification_status DEFAULT 'pending',
    confidence_score DECIMAL(5, 2),
    document_type VARCHAR(100),
    document_number VARCHAR(255),
    expiry_date DATE,
    verification_data JSONB,
    failure_reason TEXT,
    manual_review_notes TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT kyc_verifications_tenant_id_check CHECK (tenant_id IS NOT NULL)
);

-- ============================================
-- AI ASSISTANT LOGS TABLE
-- ============================================

CREATE TABLE ai_assistant_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255) NOT NULL,
    question TEXT NOT NULL,
    response TEXT NOT NULL,
    tokens_used INTEGER,
    model_used VARCHAR(100),
    category VARCHAR(100),
    escalated_to_human BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Tenants
CREATE INDEX idx_tenants_business_slug ON tenants(business_slug);
CREATE INDEX idx_tenants_verification_status ON tenants(verification_status);
CREATE INDEX idx_tenants_subscription_status ON tenants(subscription_status);
CREATE INDEX idx_tenants_country ON tenants(business_country);

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Tours
CREATE INDEX idx_tours_tenant_id ON tours(tenant_id);
CREATE INDEX idx_tours_slug ON tours(slug);
CREATE INDEX idx_tours_status ON tours(listing_status);
CREATE INDEX idx_tours_destination ON tours(destination_country, destination_city);
CREATE INDEX idx_tours_featured ON tours(is_featured);
CREATE INDEX idx_tours_active ON tours(is_active);

-- Travel Services
CREATE INDEX idx_travel_services_tenant_id ON travel_services(tenant_id);
CREATE INDEX idx_travel_services_slug ON travel_services(slug);
CREATE INDEX idx_travel_services_status ON travel_services(listing_status);
CREATE INDEX idx_travel_services_destination ON travel_services(destination_country, destination_city);
CREATE INDEX idx_travel_services_featured ON travel_services(is_featured);
CREATE INDEX idx_travel_services_active ON travel_services(is_active);

-- Car Rentals
CREATE INDEX idx_car_rentals_tenant_id ON car_rentals(tenant_id);
CREATE INDEX idx_car_rentals_slug ON car_rentals(slug);
CREATE INDEX idx_car_rentals_status ON car_rentals(listing_status);
CREATE INDEX idx_car_rentals_location ON car_rentals(location_country, location_city);
CREATE INDEX idx_car_rentals_featured ON car_rentals(is_featured);
CREATE INDEX idx_car_rentals_active ON car_rentals(is_active);

-- Adventure Activities
CREATE INDEX idx_adventure_activities_tenant_id ON adventure_activities(tenant_id);
CREATE INDEX idx_adventure_activities_slug ON adventure_activities(slug);
CREATE INDEX idx_adventure_activities_status ON adventure_activities(listing_status);
CREATE INDEX idx_adventure_activities_location ON adventure_activities(location_country, location_city);
CREATE INDEX idx_adventure_activities_featured ON adventure_activities(is_featured);
CREATE INDEX idx_adventure_activities_active ON adventure_activities(is_active);

-- Bookings
CREATE INDEX idx_bookings_tenant_id ON bookings(tenant_id);
CREATE INDEX idx_bookings_listing_id ON bookings(listing_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX idx_bookings_dates ON bookings(start_date, end_date);

-- Conversations
CREATE INDEX idx_conversations_tenant_id ON conversations(tenant_id);
CREATE INDEX idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX idx_conversations_staff_id ON conversations(staff_id);
CREATE INDEX idx_conversations_active ON conversations(is_active);

-- Messages
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Reviews
CREATE INDEX idx_reviews_tenant_id ON reviews(tenant_id);
CREATE INDEX idx_reviews_listing_id ON reviews(listing_id);
CREATE INDEX idx_reviews_listing_type ON reviews(listing_type);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_approved ON reviews(is_approved);

-- Support Tickets
CREATE INDEX idx_support_tickets_tenant_id ON support_tickets(tenant_id);
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);

-- Subscriptions
CREATE INDEX idx_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_dates ON subscriptions(start_date, end_date);

-- Payments
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX idx_payments_transaction_reference ON payments(transaction_reference);
CREATE INDEX idx_payments_invoice_number ON payments(invoice_number);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider ON payments(payment_provider);

-- Payment Webhooks
CREATE INDEX idx_payment_webhooks_payment_id ON payment_webhooks(payment_id);
CREATE INDEX idx_payment_webhooks_provider ON payment_webhooks(provider);
CREATE INDEX idx_payment_webhooks_processed ON payment_webhooks(processed);

-- Audit Logs
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- KYC Verifications
CREATE INDEX idx_kyc_verifications_tenant_id ON kyc_verifications(tenant_id);
CREATE INDEX idx_kyc_verifications_status ON kyc_verifications(status);
CREATE INDEX idx_kyc_verifications_provider ON kyc_verifications(provider);

-- AI Assistant Logs
CREATE INDEX idx_ai_assistant_logs_user_id ON ai_assistant_logs(user_id);
CREATE INDEX idx_ai_assistant_logs_session_id ON ai_assistant_logs(session_id);
CREATE INDEX idx_ai_assistant_logs_created_at ON ai_assistant_logs(created_at);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Create triggers for updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tours_updated_at BEFORE UPDATE ON tours
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_travel_services_updated_at BEFORE UPDATE ON travel_services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_car_rentals_updated_at BEFORE UPDATE ON car_rentals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_adventure_activities_updated_at BEFORE UPDATE ON adventure_activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kyc_verifications_updated_at BEFORE UPDATE ON kyc_verifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('ticket_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sequence for ticket numbers
CREATE SEQUENCE ticket_number_seq START 1;

-- Trigger for ticket number generation
CREATE TRIGGER generate_support_ticket_number BEFORE INSERT ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sequence for invoice numbers
CREATE SEQUENCE invoice_number_seq START 1;

-- Trigger for invoice number generation
CREATE TRIGGER generate_payment_invoice_number BEFORE INSERT ON payments
    FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- Function to generate transaction reference
CREATE OR REPLACE FUNCTION generate_transaction_reference()
RETURNS TRIGGER AS $$
BEGIN
    NEW.transaction_reference := 'TXN-' || TO_CHAR(NOW(), 'YYYYMMDDHHMMSS') || '-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for transaction reference generation
CREATE TRIGGER generate_payment_transaction_reference BEFORE INSERT ON payments
    FOR EACH ROW EXECUTE FUNCTION generate_transaction_reference();
