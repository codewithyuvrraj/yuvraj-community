-- Real-time presence tracking system
-- Add presence fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Function to update user presence
CREATE OR REPLACE FUNCTION update_user_presence(user_id UUID, is_online BOOLEAN DEFAULT true)
RETURNS void AS $$
BEGIN
    UPDATE profiles 
    SET 
        is_online = update_user_presence.is_online,
        last_seen = NOW(),
        last_activity = CASE WHEN update_user_presence.is_online THEN NOW() ELSE last_activity END
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user status
CREATE OR REPLACE FUNCTION get_user_status(user_id UUID)
RETURNS TABLE(
    is_online BOOLEAN,
    last_seen TIMESTAMP WITH TIME ZONE,
    status_text TEXT,
    minutes_ago INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.is_online,
        p.last_seen,
        CASE 
            WHEN p.is_online THEN 'Online'
            WHEN p.last_seen > NOW() - INTERVAL '5 minutes' THEN 'Active'
            WHEN p.last_seen > NOW() - INTERVAL '1 hour' THEN 'Recently active'
            ELSE 'Offline'
        END as status_text,
        EXTRACT(EPOCH FROM (NOW() - p.last_seen))::INTEGER / 60 as minutes_ago
    FROM profiles p
    WHERE p.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-cleanup offline users (run periodically)
CREATE OR REPLACE FUNCTION cleanup_offline_users()
RETURNS void AS $$
BEGIN
    UPDATE profiles 
    SET is_online = false 
    WHERE last_activity < NOW() - INTERVAL '2 minutes'
    AND is_online = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_user_presence TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_status TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_offline_users TO authenticated;