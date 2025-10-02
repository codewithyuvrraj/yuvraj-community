-- Fix messages table structure
-- Run this SQL in Supabase SQL Editor

-- 1. Drop existing table if it has wrong structure
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

-- 3. Create indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);

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

-- 6. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 7. Grant permissions
GRANT ALL ON messages TO authenticated;
GRANT ALL ON messages TO anon;

-- 8. Create simple send message function
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