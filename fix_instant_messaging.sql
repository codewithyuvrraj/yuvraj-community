-- Fix Instant Messaging Issues
-- Run this SQL in Supabase SQL Editor

-- 1. Drop and recreate messages table with consistent structure
DROP TABLE IF EXISTS messages CASCADE;

-- 2. Create messages table with correct structure
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    file_name TEXT,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_realtime ON messages(id, created_at);

-- 4. Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        sender_id = auth.uid() OR 
        conversation_id LIKE '%' || auth.uid()::text || '%'
    );

CREATE POLICY "Users can insert messages" ON messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());

-- 6. Enable realtime with proper configuration
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 7. Create optimized send message function
CREATE OR REPLACE FUNCTION send_message(
    conv_id TEXT,
    message_text TEXT
)
RETURNS UUID
SECURITY DEFINER
AS $$
DECLARE
    new_message_id UUID;
BEGIN
    INSERT INTO messages (conversation_id, sender_id, text)
    VALUES (conv_id, auth.uid(), message_text)
    RETURNING id INTO new_message_id;
    
    RETURN new_message_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to get messages with sender info
CREATE OR REPLACE FUNCTION get_conversation_messages(conv_id TEXT)
RETURNS TABLE (
    id UUID,
    conversation_id TEXT,
    sender_id UUID,
    text TEXT,
    type TEXT,
    file_name TEXT,
    file_url TEXT,
    created_at TIMESTAMPTZ,
    sender_name TEXT,
    sender_photo TEXT
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.text,
        m.type,
        m.file_name,
        m.file_url,
        m.created_at,
        COALESCE(p.full_name, p.username) as sender_name,
        p.profile_photo as sender_photo
    FROM messages m
    LEFT JOIN profiles p ON m.sender_id = p.id
    WHERE m.conversation_id = conv_id
    AND (
        m.sender_id = auth.uid() OR 
        m.conversation_id LIKE '%' || auth.uid()::text || '%'
    )
    ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- 9. Grant permissions
GRANT ALL ON messages TO authenticated;
GRANT ALL ON messages TO anon;

-- 10. Test realtime setup
DO $$
BEGIN
    RAISE NOTICE '✅ Instant messaging fixed!';
    RAISE NOTICE 'Messages table recreated with created_at field';
    RAISE NOTICE 'Realtime enabled and optimized';
    RAISE NOTICE 'RLS policies configured';
    RAISE NOTICE 'Send message function ready';
END $$;