-- Migration 016: Scheduled Email Reports

-- ============================================
-- Report Schedules Table
-- ============================================
CREATE TABLE IF NOT EXISTS report_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('weekly', 'monthly', 'on_demand')),
    email_recipients TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_sent_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    format TEXT DEFAULT 'pdf' CHECK (format IN ('pdf', 'html', 'json')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Report Delivery Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS report_delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID REFERENCES report_schedules ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
    error_message TEXT,
    recipient_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_report_schedules_org ON report_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_run ON report_schedules(next_run_at) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_report_delivery_logs_org ON report_delivery_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_delivery_logs_sent ON report_delivery_logs(sent_at DESC);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Report schedules - org admins only
CREATE POLICY "Admins can manage reports" ON report_schedules
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can view reports" ON report_schedules
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

-- Report delivery logs - view only
CREATE POLICY "Users can view delivery logs" ON report_delivery_logs
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

-- ============================================
-- Helper Functions
-- ============================================

-- Function to set next run date based on type
CREATE OR REPLACE FUNCTION calculate_next_run(p_type TEXT, p_current TIMESTAMPTZ DEFAULT NOW())
RETURNS TIMESTAMPTZ AS $$
BEGIN
    IF p_type = 'weekly' THEN
        RETURN p_current + INTERVAL '7 days';
    ELSIF p_type = 'monthly' THEN
        RETURN p_current + INTERVAL '1 month';
    ELSE
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update next_run_at on insert
CREATE OR REPLACE FUNCTION trg_set_next_run()
RETURNS TRIGGER AS $$
BEGIN
    NEW.next_run_at := calculate_next_run(NEW.type, NEW.created_at);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER report_schedules_insert_next_run
    BEFORE INSERT ON report_schedules
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_next_run();
