-- Add email verification codes table
CREATE TABLE IF NOT EXISTS email_verification_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    verification_code VARCHAR(6) NOT NULL,
    new_email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used BOOLEAN DEFAULT FALSE
);

-- Add RLS policies for email verification codes
ALTER TABLE email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own verification codes
CREATE POLICY "Users can view own verification codes" ON email_verification_codes
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own verification codes
CREATE POLICY "Users can insert own verification codes" ON email_verification_codes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own verification codes
CREATE POLICY "Users can update own verification codes" ON email_verification_codes
    FOR UPDATE USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_email_verification_codes_user_id ON email_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_codes_expires_at ON email_verification_codes(expires_at);

-- Add email column to profiles table if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Update existing profiles with email from auth.users
UPDATE profiles 
SET email = auth.users.email 
FROM auth.users 
WHERE profiles.id = auth.users.id 
AND profiles.email IS NULL;