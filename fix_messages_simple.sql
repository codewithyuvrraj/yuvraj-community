-- Simple fix for messages table RLS policies
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can read their messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create simple policies based on conversation_id containing user ID
CREATE POLICY "Users can read their messages" ON messages
    FOR SELECT USING (
        sender_id = auth.uid() OR 
        conversation_id LIKE '%' || auth.uid() || '%'
    );

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own messages" ON messages
    FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can delete own messages" ON messages
    FOR DELETE USING (sender_id = auth.uid());