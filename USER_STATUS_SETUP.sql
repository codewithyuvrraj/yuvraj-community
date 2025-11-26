-- USER STATUS TABLE SETUP
-- This adds online/offline status tracking to BusinessConnect

-- Create user_status table
CREATE TABLE IF NOT EXISTS user_status (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_status ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DROP POLICY IF EXISTS user_status_policy ON user_status;

-- Create RLS policy
CREATE POLICY user_status_policy ON user_status FOR ALL USING (true) WITH CHECK (true);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_status_online ON user_status(is_online);
CREATE INDEX IF NOT EXISTS idx_user_status_last_seen ON user_status(last_seen);

-- Grant permissions
GRANT ALL ON user_status TO anon, authenticated;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_user_status_updated_at ON user_status;
CREATE TRIGGER update_user_status_updated_at
    BEFORE UPDATE ON user_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

SELECT 'User status table setup completed successfully!' as result;