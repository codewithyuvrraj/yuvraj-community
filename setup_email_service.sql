-- Email Service Configuration for BusinessConnect
-- This file sets up the database structure for email services

-- Create email service configuration table
CREATE TABLE IF NOT EXISTS email_service_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_name VARCHAR(50) NOT NULL,
    api_key TEXT,
    service_id TEXT,
    template_id TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert EmailJS configuration with real credentials
INSERT INTO email_service_config (service_name, service_id, template_id, is_active)
VALUES ('emailjs', 'service_tvwdsjv', 'template_uk3cpsh', true)
ON CONFLICT DO NOTHING;

-- Create email logs table for tracking sent emails
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email_type VARCHAR(50) NOT NULL,
    recipient_email TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on email tables
ALTER TABLE email_service_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_service_config (admin only)
DROP POLICY IF EXISTS "Admin can manage email config" ON email_service_config;
CREATE POLICY "Admin can manage email config" ON email_service_config
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- RLS policies for email_logs (users can see their own logs)
DROP POLICY IF EXISTS "Users can view own email logs" ON email_logs;
CREATE POLICY "Users can view own email logs" ON email_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert email logs" ON email_logs;
CREATE POLICY "System can insert email logs" ON email_logs
    FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);

-- Update email_verification_codes table to include email logs reference
ALTER TABLE email_verification_codes 
ADD COLUMN IF NOT EXISTS email_log_id UUID REFERENCES email_logs(id);

-- Function to log email attempts
CREATE OR REPLACE FUNCTION log_email_attempt(
    p_user_id UUID,
    p_email_type VARCHAR(50),
    p_recipient_email TEXT,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO email_logs (user_id, email_type, recipient_email, expires_at)
    VALUES (p_user_id, p_email_type, p_recipient_email, p_expires_at)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update email log status
CREATE OR REPLACE FUNCTION update_email_log_status(
    p_log_id UUID,
    p_status VARCHAR(20),
    p_error_message TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE email_logs 
    SET 
        status = p_status,
        error_message = p_error_message,
        sent_at = CASE WHEN p_status = 'sent' THEN NOW() ELSE sent_at END
    WHERE id = p_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON email_service_config TO authenticated;
GRANT ALL ON email_logs TO authenticated;
GRANT EXECUTE ON FUNCTION log_email_attempt TO authenticated;
GRANT EXECUTE ON FUNCTION update_email_log_status TO authenticated;