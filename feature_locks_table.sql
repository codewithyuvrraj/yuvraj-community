-- Feature Locks Table for BusinessConnect
-- This table tracks locked features (messages, groups, channels) for users

-- Create feature_locks table
CREATE TABLE IF NOT EXISTS feature_locks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    feature_type TEXT NOT NULL CHECK (feature_type IN ('messages', 'groups', 'channels')),
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure one lock record per user per feature
    UNIQUE(user_id, feature_type)
);

-- Enable RLS on feature_locks table
ALTER TABLE feature_locks ENABLE ROW LEVEL SECURITY;

-- RLS policy for feature_locks - users can only manage their own locks
CREATE POLICY "Users can manage their own feature locks" ON feature_locks
    FOR ALL USING (auth.uid() = user_id);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_feature_locks_user_id ON feature_locks(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_locks_feature_type ON feature_locks(feature_type);

-- Function to check if feature is locked for user
CREATE OR REPLACE FUNCTION is_feature_locked_for_user(
    p_user_id UUID,
    p_feature_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    lock_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM feature_locks 
        WHERE user_id = p_user_id 
        AND feature_type = p_feature_type
    ) INTO lock_exists;
    
    RETURN lock_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to lock feature
CREATE OR REPLACE FUNCTION lock_feature(
    p_user_id UUID,
    p_feature_type TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO feature_locks (user_id, feature_type)
    VALUES (p_user_id, p_feature_type)
    ON CONFLICT (user_id, feature_type) DO NOTHING;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unlock feature
CREATE OR REPLACE FUNCTION unlock_feature(
    p_user_id UUID,
    p_feature_type TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM feature_locks 
    WHERE user_id = p_user_id 
    AND feature_type = p_feature_type;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get locked features for user
CREATE OR REPLACE FUNCTION get_locked_features_for_user(
    p_user_id UUID
)
RETURNS TABLE (
    feature_type TEXT,
    locked_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fl.feature_type,
        fl.locked_at
    FROM feature_locks fl
    WHERE fl.user_id = p_user_id
    ORDER BY fl.locked_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON feature_locks TO authenticated;
GRANT EXECUTE ON FUNCTION is_feature_locked_for_user(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION lock_feature(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION unlock_feature(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_locked_features_for_user(UUID) TO authenticated;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;