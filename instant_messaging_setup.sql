-- Instant Messaging Setup for BusinessConnect
-- Run this SQL in Supabase SQL Editor

-- 1. Ensure messages table exists with correct structure
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    file_name TEXT,
    file_url TEXT,
    message_timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_timestamp 
ON messages(conversation_id, message_timestamp);

CREATE INDEX IF NOT EXISTS idx_messages_sender 
ON messages(sender_id);

-- 3. Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

-- 5. Create RLS policies for messages
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        sender_id = auth.uid() OR 
        conversation_id LIKE '%' || auth.uid()::text || '%'
    );

CREATE POLICY "Users can insert messages" ON messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (sender_id = auth.uid());

-- 6. Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 7. Create function to notify on new messages
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify all clients about new message
    PERFORM pg_notify(
        'new_message',
        json_build_object(
            'conversation_id', NEW.conversation_id,
            'sender_id', NEW.sender_id,
            'message_id', NEW.id,
            'timestamp', NEW.message_timestamp
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for new message notifications
DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
CREATE TRIGGER trigger_notify_new_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_message();

-- 9. Grant necessary permissions
GRANT ALL ON messages TO authenticated;
GRANT ALL ON messages TO anon;

-- 10. Create function to get conversation messages
CREATE OR REPLACE FUNCTION get_conversation_messages(conv_id TEXT)
RETURNS TABLE (
    id UUID,
    conversation_id TEXT,
    sender_id UUID,
    text TEXT,
    type TEXT,
    file_name TEXT,
    file_url TEXT,
    message_timestamp TIMESTAMPTZ,
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
        m.message_timestamp,
        p.full_name as sender_name,
        p.profile_photo as sender_photo
    FROM messages m
    JOIN profiles p ON m.sender_id = p.id
    WHERE m.conversation_id = conv_id
    AND (
        m.sender_id = auth.uid() OR 
        m.conversation_id LIKE '%' || auth.uid()::text || '%'
    )
    ORDER BY m.message_timestamp ASC;
END;
$$ LANGUAGE plpgsql;

-- 11. Create function to send message
CREATE OR REPLACE FUNCTION send_message(
    conv_id TEXT,
    message_text TEXT,
    message_type TEXT DEFAULT 'text',
    file_name_param TEXT DEFAULT NULL,
    file_url_param TEXT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
AS $$
DECLARE
    new_message_id UUID;
BEGIN
    INSERT INTO messages (
        conversation_id,
        sender_id,
        text,
        type,
        file_name,
        file_url
    ) VALUES (
        conv_id,
        auth.uid(),
        message_text,
        message_type,
        file_name_param,
        file_url_param
    ) RETURNING id INTO new_message_id;
    
    RETURN new_message_id;
END;
$$ LANGUAGE plpgsql;

-- 12. Test the setup
DO $$
BEGIN
    RAISE NOTICE 'Instant messaging setup completed successfully!';
    RAISE NOTICE 'Tables created: messages';
    RAISE NOTICE 'Functions created: notify_new_message, get_conversation_messages, send_message';
    RAISE NOTICE 'Realtime enabled for messages table';
    RAISE NOTICE 'RLS policies configured';
END $$;