-- Chat Lock Table for BusinessConnect
-- This table tracks locked conversations for users

-- Create chat_locks table
CREATE TABLE IF NOT EXISTS chat_locks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    conversation_id TEXT NOT NULL,
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure one lock record per user per conversation
    UNIQUE(user_id, conversation_id)
);

-- Enable RLS on chat_locks table
ALTER TABLE chat_locks ENABLE ROW LEVEL SECURITY;

-- RLS policy for chat_locks - users can only manage their own locks
CREATE POLICY "Users can manage their own chat locks" ON chat_locks
    FOR ALL USING (auth.uid() = user_id);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_chat_locks_user_id ON chat_locks(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_locks_conversation_id ON chat_locks(conversation_id);

-- Function to check if conversation is locked for user
CREATE OR REPLACE FUNCTION is_conversation_locked_for_user(
    p_user_id UUID,
    p_conversation_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    lock_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM chat_locks 
        WHERE user_id = p_user_id 
        AND conversation_id = p_conversation_id
    ) INTO lock_exists;
    
    RETURN lock_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to lock conversation
CREATE OR REPLACE FUNCTION lock_conversation(
    p_user_id UUID,
    p_conversation_id TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO chat_locks (user_id, conversation_id)
    VALUES (p_user_id, p_conversation_id)
    ON CONFLICT (user_id, conversation_id) DO NOTHING;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unlock conversation
CREATE OR REPLACE FUNCTION unlock_conversation(
    p_user_id UUID,
    p_conversation_id TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM chat_locks 
    WHERE user_id = p_user_id 
    AND conversation_id = p_conversation_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get locked conversations for user
CREATE OR REPLACE FUNCTION get_locked_conversations_for_user(
    p_user_id UUID
)
RETURNS TABLE (
    conversation_id TEXT,
    locked_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cl.conversation_id,
        cl.locked_at
    FROM chat_locks cl
    WHERE cl.user_id = p_user_id
    ORDER BY cl.locked_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON chat_locks TO authenticated;
GRANT EXECUTE ON FUNCTION is_conversation_locked_for_user(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION lock_conversation(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION unlock_conversation(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_locked_conversations_for_user(UUID) TO authenticated;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;