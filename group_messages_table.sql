-- Group Messages Table for Instant Group Chat
CREATE TABLE IF NOT EXISTS group_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    file_url TEXT,
    file_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender_id ON group_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at);

-- Enable RLS
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group messages
CREATE POLICY "Users can view messages from groups they belong to" ON group_messages
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM group_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages to groups they belong to" ON group_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        group_id IN (
            SELECT group_id FROM group_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own messages" ON group_messages
    FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages" ON group_messages
    FOR DELETE USING (sender_id = auth.uid());

-- Function to get group message count
CREATE OR REPLACE FUNCTION get_group_message_count(group_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM group_messages
        WHERE group_id = group_id_param
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent group messages
CREATE OR REPLACE FUNCTION get_recent_group_messages(group_id_param UUID, limit_param INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    group_id UUID,
    sender_id UUID,
    text TEXT,
    message_type VARCHAR,
    file_url TEXT,
    file_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    sender_name TEXT,
    sender_username TEXT,
    sender_photo TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gm.id,
        gm.group_id,
        gm.sender_id,
        gm.text,
        gm.message_type,
        gm.file_url,
        gm.file_name,
        gm.created_at,
        p.full_name as sender_name,
        p.username as sender_username,
        p.profile_photo as sender_photo
    FROM group_messages gm
    JOIN profiles p ON gm.sender_id = p.id
    WHERE gm.group_id = group_id_param
    ORDER BY gm.created_at DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_group_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_group_messages_updated_at_trigger
    BEFORE UPDATE ON group_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_group_messages_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON group_messages TO authenticated;
GRANT EXECUTE ON FUNCTION get_group_message_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_group_messages(UUID, INTEGER) TO authenticated;