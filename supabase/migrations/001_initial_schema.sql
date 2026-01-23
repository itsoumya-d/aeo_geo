-- Cognition AI Visibility Engine Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Organizations Table
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'agency', 'enterprise')),
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    audit_credits_remaining INTEGER DEFAULT 5,
    rewrite_credits_remaining INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Users Table (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations ON DELETE SET NULL,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Domains Table
-- ============================================
CREATE TABLE IF NOT EXISTS domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
    domain TEXT NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    verification_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, domain)
);

-- ============================================
-- Audits Table
-- ============================================
CREATE TABLE IF NOT EXISTS audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
    domain_id UUID REFERENCES domains ON DELETE SET NULL,
    domain_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
    report JSONB,
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ============================================
-- Audit Pages Table
-- ============================================
CREATE TABLE IF NOT EXISTS audit_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES audits ON DELETE CASCADE,
    url TEXT NOT NULL,
    page_type TEXT,
    quote_likelihood INTEGER CHECK (quote_likelihood >= 0 AND quote_likelihood <= 100),
    ai_understanding TEXT,
    recommendations JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Rewrite Simulations Table
-- ============================================
CREATE TABLE IF NOT EXISTS rewrite_simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
    audit_page_id UUID REFERENCES audit_pages ON DELETE SET NULL,
    original_text TEXT NOT NULL,
    rewrite_text TEXT NOT NULL,
    score_delta INTEGER,
    vector_shift FLOAT,
    reasoning TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Invitations Table (for team invites)
-- ============================================
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    invited_by UUID REFERENCES users ON DELETE SET NULL,
    token TEXT UNIQUE NOT NULL DEFAULT uuid_generate_v4()::text,
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_domains_organization ON domains(organization_id);
CREATE INDEX IF NOT EXISTS idx_audits_organization ON audits(organization_id);
CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
CREATE INDEX IF NOT EXISTS idx_audits_created ON audits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_pages_audit ON audit_pages(audit_id);
CREATE INDEX IF NOT EXISTS idx_simulations_organization ON rewrite_simulations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewrite_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Users can read their organization
CREATE POLICY "Users can read own organization" ON organizations
    FOR SELECT USING (
        id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

-- Organization owners can update their organization
CREATE POLICY "Owners can update organization" ON organizations
    FOR UPDATE USING (
        id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'owner')
    );

-- Users can read domains in their organization
CREATE POLICY "Users can read org domains" ON domains
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

-- Admins and owners can manage domains
CREATE POLICY "Admins can manage domains" ON domains
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Users can read audits in their organization
CREATE POLICY "Users can read org audits" ON audits
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

-- Users can create audits in their organization
CREATE POLICY "Users can create org audits" ON audits
    FOR INSERT WITH CHECK (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

-- Users can update audits in their organization
CREATE POLICY "Users can update org audits" ON audits
    FOR UPDATE USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

-- Users can read audit pages for their audits
CREATE POLICY "Users can read audit pages" ON audit_pages
    FOR SELECT USING (
        audit_id IN (
            SELECT a.id FROM audits a
            JOIN users u ON u.organization_id = a.organization_id
            WHERE u.id = auth.uid()
        )
    );

-- Users can manage their own simulations
CREATE POLICY "Users can manage simulations" ON rewrite_simulations
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

-- Users can view invitations for their organization
CREATE POLICY "Users can view org invitations" ON invitations
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Admins can manage invitations
CREATE POLICY "Admins can manage invitations" ON invitations
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- ============================================
-- Functions & Triggers
-- ============================================

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on organizations
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Seed Data for Plans
-- ============================================
-- Note: This is just documentation, actual plan limits are enforced in code

COMMENT ON COLUMN organizations.plan IS '
Plan limits:
- free: 5 audits/month, 50 simulations/month
- starter ($49/mo): 5 audits/month, 50 simulations/month
- pro ($149/mo): 25 audits/month, 200 simulations/month
- agency ($399/mo): Unlimited
- enterprise (custom): Custom limits
';
