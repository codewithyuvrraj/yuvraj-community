-- Drop existing policies to avoid conflicts, then recreate them
-- This fixes the 401 errors for instant messaging

-- Drop existing group_messages policies if they exist
DROP POLICY IF EXISTS "Users can read group messages" ON group_messages;
DROP POLICY IF EXISTS "Users can send group messages" ON group_messages;
DROP POLICY IF EXISTS "Users can update own group messages" ON group_messages;
DROP POLICY IF EXISTS "Users can delete own group messages" ON group_messages;

-- Drop existing channel_messages policies if they exist
DROP POLICY IF EXISTS "Users can read channel messages" ON channel_messages;
DROP POLICY IF EXISTS "Users can send channel messages" ON channel_messages;
DROP POLICY IF EXISTS "Users can update own channel messages" ON channel_messages;
DROP POLICY IF EXISTS "Users can delete own channel messages" ON channel_messages;

-- Drop existing messages policies if they exist
DROP POLICY IF EXISTS "Users can read their messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;

-- Enable RLS on all tables
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Recreate group_messages policies
CREATE POLICY "Users can read group messages" ON group_messages
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM group_members WHERE user_id = auth.uid()
        ) OR
        group_id IN (
            SELECT id FROM groups WHERE creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can send group messages" ON group_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        (group_id IN (
            SELECT group_id FROM group_members WHERE user_id = auth.uid()
        ) OR
        group_id IN (
            SELECT id FROM groups WHERE creator_id = auth.uid()
        ))
    );

CREATE POLICY "Users can update own group messages" ON group_messages
    FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can delete own group messages" ON group_messages
    FOR DELETE USING (sender_id = auth.uid());

-- Recreate channel_messages policies
CREATE POLICY "Users can read channel messages" ON channel_messages
    FOR SELECT USING (
        channel_id IN (
            SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
        ) OR
        channel_id IN (
            SELECT id FROM channels WHERE creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can send channel messages" ON channel_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        (channel_id IN (
            SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
        ) OR
        channel_id IN (
            SELECT id FROM channels WHERE creator_id = auth.uid()
        ))
    );

CREATE POLICY "Users can update own channel messages" ON channel_messages
    FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can delete own channel messages" ON channel_messages
    FOR DELETE USING (sender_id = auth.uid());

-- Recreate messages policies for instant messaging (THIS IS THE KEY FIX)
CREATE POLICY "Users can read their messages" ON messages
    FOR SELECT USING (
        sender_id = auth.uid() OR 
        receiver_id = auth.uid()
    );

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update own messages" ON messages
    FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can delete own messages" ON messages
    FOR DELETE USING (sender_id = auth.uid());