-- Group Leave Tracking Table
CREATE TABLE IF NOT EXISTS group_leave_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('group', 'channel')),
    left_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_leave_history_user_id ON group_leave_history(user_id);
CREATE INDEX IF NOT EXISTS idx_group_leave_history_group_id ON group_leave_history(group_id);
CREATE INDEX IF NOT EXISTS idx_group_leave_history_channel_id ON group_leave_history(channel_id);
CREATE INDEX IF NOT EXISTS idx_group_leave_history_type ON group_leave_history(leave_type);
CREATE INDEX IF NOT EXISTS idx_group_leave_history_left_at ON group_leave_history(left_at DESC);

-- RLS Policies
ALTER TABLE group_leave_history ENABLE ROW LEVEL SECURITY;

-- Users can insert their own leave records
CREATE POLICY "Users can insert own leave records" ON group_leave_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own leave history
CREATE POLICY "Users can view own leave history" ON group_leave_history
    FOR SELECT USING (auth.uid() = user_id);

-- Group/channel creators can view leave history for their groups/channels
CREATE POLICY "Creators can view leave history" ON group_leave_history
    FOR SELECT USING (
        (leave_type = 'group' AND group_id IN (
            SELECT id FROM groups WHERE creator_id = auth.uid()
        )) OR
        (leave_type = 'channel' AND channel_id IN (
            SELECT id FROM channels WHERE creator_id = auth.uid()
        ))
    );

-- Function to safely leave group with logging
CREATE OR REPLACE FUNCTION leave_group_with_logging(
    p_group_id UUID,
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    group_creator UUID;
BEGIN
    -- Check if user is not the group creator
    SELECT creator_id INTO group_creator FROM groups WHERE id = p_group_id;
    
    IF group_creator = p_user_id THEN
        RAISE EXCEPTION 'Group creator cannot leave their own group';
    END IF;
    
    -- Remove from group_members
    DELETE FROM group_members 
    WHERE group_id = p_group_id AND user_id = p_user_id;
    
    -- Log the leave action
    INSERT INTO group_leave_history (
        user_id, 
        group_id, 
        leave_type, 
        reason
    ) VALUES (
        p_user_id, 
        p_group_id, 
        'group', 
        p_reason
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely leave channel with logging
CREATE OR REPLACE FUNCTION leave_channel_with_logging(
    p_channel_id UUID,
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    channel_creator UUID;
BEGIN
    -- Check if user is not the channel creator
    SELECT creator_id INTO channel_creator FROM channels WHERE id = p_channel_id;
    
    IF channel_creator = p_user_id THEN
        RAISE EXCEPTION 'Channel creator cannot leave their own channel';
    END IF;
    
    -- Remove from channel_members
    DELETE FROM channel_members 
    WHERE channel_id = p_channel_id AND user_id = p_user_id;
    
    -- Log the leave action
    INSERT INTO group_leave_history (
        user_id, 
        channel_id, 
        leave_type, 
        reason
    ) VALUES (
        p_user_id, 
        p_channel_id, 
        'channel', 
        p_reason
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's leave history
CREATE OR REPLACE FUNCTION get_user_leave_history(p_user_id UUID)
RETURNS TABLE (
    leave_id UUID,
    group_name TEXT,
    channel_name TEXT,
    leave_type TEXT,
    left_at TIMESTAMP WITH TIME ZONE,
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        glh.id as leave_id,
        g.name as group_name,
        c.name as channel_name,
        glh.leave_type,
        glh.left_at,
        glh.reason
    FROM group_leave_history glh
    LEFT JOIN groups g ON glh.group_id = g.id
    LEFT JOIN channels c ON glh.channel_id = c.id
    WHERE glh.user_id = p_user_id
    ORDER BY glh.left_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;