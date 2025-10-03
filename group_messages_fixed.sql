-- Drop existing table if it exists to start fresh
DROP TABLE IF EXISTS group_messages CASCADE;

-- Create Group Messages Table from scratch
CREATE TABLE group_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX idx_group_messages_sender_id ON group_messages(sender_id);
CREATE INDEX idx_group_messages_created_at ON group_messages(created_at);

-- Enable RLS
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- Simple RLS policy
CREATE POLICY "Allow all authenticated users" ON group_messages
    FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON group_messages TO authenticated;