-- Chat Delete Functions for BusinessConnect
-- This file contains SQL functions for chat deletion functionality

-- Function to delete all messages in a conversation
CREATE OR REPLACE FUNCTION delete_conversation_messages(conversation_id_param TEXT)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete all messages in the conversation
    DELETE FROM messages 
    WHERE conversation_id = conversation_id_param;
    
    -- Get the count of deleted messages
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete conversation for a specific user (soft delete approach)
CREATE OR REPLACE FUNCTION delete_conversation_for_user(
    user_id_param UUID,
    conversation_id_param TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Insert or update a record to mark conversation as deleted for this user
    INSERT INTO conversation_deletions (user_id, conversation_id, deleted_at)
    VALUES (user_id_param, conversation_id_param, NOW())
    ON CONFLICT (user_id, conversation_id) 
    DO UPDATE SET deleted_at = NOW();
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create table for tracking conversation deletions (if not exists)
CREATE TABLE IF NOT EXISTS conversation_deletions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, conversation_id)
);

-- Enable RLS on conversation_deletions table
ALTER TABLE conversation_deletions ENABLE ROW LEVEL SECURITY;

-- RLS policy for conversation_deletions
CREATE POLICY "Users can manage their own conversation deletions" ON conversation_deletions
    FOR ALL USING (auth.uid() = user_id);

-- Function to check if conversation is deleted for user
CREATE OR REPLACE FUNCTION is_conversation_deleted_for_user(
    user_id_param UUID,
    conversation_id_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    deletion_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM conversation_deletions 
        WHERE user_id = user_id_param 
        AND conversation_id = conversation_id_param
    ) INTO deletion_exists;
    
    RETURN deletion_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION delete_conversation_messages(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_conversation_for_user(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_conversation_deleted_for_user(UUID, TEXT) TO authenticated;

-- Grant table permissions
GRANT ALL ON conversation_deletions TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;