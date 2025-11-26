-- Fix group_messages RLS policies for 401 errors
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- Allow users to read messages from groups they are members of
CREATE POLICY "Users can read group messages" ON group_messages
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM group_members WHERE user_id = auth.uid()
        ) OR
        group_id IN (
            SELECT id FROM groups WHERE creator_id = auth.uid()
        )
    );

-- Allow users to insert messages to groups they are members of
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

-- Allow users to update their own messages
CREATE POLICY "Users can update own group messages" ON group_messages
    FOR UPDATE USING (sender_id = auth.uid());

-- Allow users to delete their own messages
CREATE POLICY "Users can delete own group messages" ON group_messages
    FOR DELETE USING (sender_id = auth.uid());

-- Fix channel_messages RLS policies
ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY;

-- Allow users to read messages from channels they are members of
CREATE POLICY "Users can read channel messages" ON channel_messages
    FOR SELECT USING (
        channel_id IN (
            SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
        ) OR
        channel_id IN (
            SELECT id FROM channels WHERE creator_id = auth.uid()
        )
    );

-- Allow users to insert messages to channels they are members of
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

-- Allow users to update their own messages
CREATE POLICY "Users can update own channel messages" ON channel_messages
    FOR UPDATE USING (sender_id = auth.uid());

-- Allow users to delete their own messages
CREATE POLICY "Users can delete own channel messages" ON channel_messages
    FOR DELETE USING (sender_id = auth.uid());

-- Fix messages table RLS policies for instant messaging
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow users to read messages they sent or received
CREATE POLICY "Users can read their messages" ON messages
    FOR SELECT USING (
        sender_id = auth.uid() OR 
        receiver_id = auth.uid()
    );

-- Allow users to send messages
CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Allow users to update their own messages
CREATE POLICY "Users can update own messages" ON messages
    FOR UPDATE USING (sender_id = auth.uid());

-- Allow users to delete their own messages
CREATE POLICY "Users can delete own messages" ON messages
    FOR DELETE USING (sender_id = auth.uid());