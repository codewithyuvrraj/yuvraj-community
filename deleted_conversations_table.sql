-- Deleted Conversations Table for BusinessConnect
-- This table tracks when users delete conversations

-- Create deleted_conversations table
CREATE TABLE IF NOT EXISTS deleted_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    conversation_id TEXT NOT NULL,
    other_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure one deletion record per user per conversation
    UNIQUE(user_id, conversation_id)
);

-- Enable RLS on deleted_conversations table
ALTER TABLE deleted_conversations ENABLE ROW LEVEL SECURITY;

-- RLS policy for deleted_conversations - users can only see their own deletions
CREATE POLICY "Users can manage their own deleted conversations" ON deleted_conversations
    FOR ALL USING (auth.uid() = user_id);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_deleted_conversations_user_id ON deleted_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_deleted_conversations_conversation_id ON deleted_conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_deleted_conversations_deleted_at ON deleted_conversations(deleted_at);

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS is_conversation_deleted_for_user(UUID, TEXT);

-- Function to check if conversation is deleted for user
CREATE FUNCTION is_conversation_deleted_for_user(
    p_user_id UUID,
    p_conversation_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    deletion_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM deleted_conversations 
        WHERE user_id = p_user_id 
        AND conversation_id = p_conversation_id
    ) INTO deletion_exists;
    
    RETURN deletion_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get deleted conversations for user
CREATE OR REPLACE FUNCTION get_deleted_conversations_for_user(
    p_user_id UUID
)
RETURNS TABLE (
    conversation_id TEXT,
    other_user_id UUID,
    other_user_name TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.conversation_id,
        dc.other_user_id,
        COALESCE(p.full_name, p.username) as other_user_name,
        dc.deleted_at
    FROM deleted_conversations dc
    LEFT JOIN profiles p ON p.id = dc.other_user_id
    WHERE dc.user_id = p_user_id
    ORDER BY dc.deleted_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore deleted conversation
CREATE OR REPLACE FUNCTION restore_deleted_conversation(
    p_user_id UUID,
    p_conversation_id TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM deleted_conversations 
    WHERE user_id = p_user_id 
    AND conversation_id = p_conversation_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON deleted_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION is_conversation_deleted_for_user(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_deleted_conversations_for_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_deleted_conversation(UUID, TEXT) TO authenticated;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;