-- Drop and recreate messages table with correct structure
DROP TABLE IF EXISTS messages CASCADE;

-- Create messages table with minimal required fields
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies
CREATE POLICY "Users can insert their own messages" ON messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        auth.uid() = sender_id OR 
        conversation_id LIKE '%' || auth.uid()::text || '%'
    );

-- Indexes for performance
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);