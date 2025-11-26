-- Create message read status table for proper unread tracking
CREATE TABLE IF NOT EXISTS message_read_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, conversation_id)
);

-- Enable RLS
ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own read status
CREATE POLICY "Users can manage their own read status" ON message_read_status
    FOR ALL USING (auth.uid() = user_id);

-- Function to update read status
CREATE OR REPLACE FUNCTION update_message_read_status(
    p_user_id UUID,
    p_conversation_id TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO message_read_status (user_id, conversation_id, last_read_at)
    VALUES (p_user_id, p_conversation_id, NOW())
    ON CONFLICT (user_id, conversation_id)
    DO UPDATE SET 
        last_read_at = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread message count for a conversation
CREATE OR REPLACE FUNCTION get_unread_count(
    p_user_id UUID,
    p_conversation_id TEXT
)
RETURNS INTEGER AS $$
DECLARE
    last_read TIMESTAMP WITH TIME ZONE;
    unread_count INTEGER;
BEGIN
    -- Get last read timestamp
    SELECT last_read_at INTO last_read
    FROM message_read_status
    WHERE user_id = p_user_id AND conversation_id = p_conversation_id;
    
    -- If no read status exists, count all messages from others
    IF last_read IS NULL THEN
        SELECT COUNT(*)::INTEGER INTO unread_count
        FROM messages
        WHERE conversation_id = p_conversation_id
        AND sender_id != p_user_id;
    ELSE
        -- Count messages after last read time from others
        SELECT COUNT(*)::INTEGER INTO unread_count
        FROM messages
        WHERE conversation_id = p_conversation_id
        AND sender_id != p_user_id
        AND created_at > last_read;
    END IF;
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all unread counts for a user
CREATE OR REPLACE FUNCTION get_all_unread_counts(p_user_id UUID)
RETURNS TABLE(conversation_id TEXT, unread_count INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        m.conversation_id,
        get_unread_count(p_user_id, m.conversation_id) as unread_count
    FROM messages m
    WHERE m.conversation_id LIKE '%' || p_user_id::text || '%'
    AND get_unread_count(p_user_id, m.conversation_id) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_read_status_user_conversation 
ON message_read_status(user_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_message_read_status_last_read 
ON message_read_status(last_read_at);