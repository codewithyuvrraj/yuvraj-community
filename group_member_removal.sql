-- Group Member Removal Tracking Table
CREATE TABLE IF NOT EXISTS group_member_removals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    removed_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    removed_by_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    removal_type VARCHAR(20) NOT NULL CHECK (removal_type IN ('group', 'channel')),
    removal_reason TEXT,
    removed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_member_removals_group_id ON group_member_removals(group_id);
CREATE INDEX IF NOT EXISTS idx_group_member_removals_channel_id ON group_member_removals(channel_id);
CREATE INDEX IF NOT EXISTS idx_group_member_removals_removed_user ON group_member_removals(removed_user_id);
CREATE INDEX IF NOT EXISTS idx_group_member_removals_removed_by ON group_member_removals(removed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_group_member_removals_type ON group_member_removals(removal_type);

-- RLS Policies
ALTER TABLE group_member_removals ENABLE ROW LEVEL SECURITY;

-- Only group/channel creators can insert removal records
CREATE POLICY "Creators can insert removal records" ON group_member_removals
    FOR INSERT WITH CHECK (
        (removal_type = 'group' AND group_id IN (
            SELECT id FROM groups WHERE creator_id = auth.uid()
        )) OR
        (removal_type = 'channel' AND channel_id IN (
            SELECT id FROM channels WHERE creator_id = auth.uid()
        ))
    );

-- Users can view removal records for groups/channels they created or were removed from
CREATE POLICY "View removal records" ON group_member_removals
    FOR SELECT USING (
        removed_by_user_id = auth.uid() OR 
        removed_user_id = auth.uid() OR
        (removal_type = 'group' AND group_id IN (
            SELECT id FROM groups WHERE creator_id = auth.uid()
        )) OR
        (removal_type = 'channel' AND channel_id IN (
            SELECT id FROM channels WHERE creator_id = auth.uid()
        ))
    );

-- Function to safely remove user from group with logging
CREATE OR REPLACE FUNCTION remove_user_from_group(
    p_group_id UUID,
    p_user_id UUID,
    p_removed_by UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    group_creator UUID;
BEGIN
    -- Check if the person removing is the group creator
    SELECT creator_id INTO group_creator FROM groups WHERE id = p_group_id;
    
    IF group_creator != p_removed_by THEN
        RAISE EXCEPTION 'Only group creator can remove members';
    END IF;
    
    -- Remove from group_members
    DELETE FROM group_members 
    WHERE group_id = p_group_id AND user_id = p_user_id;
    
    -- Log the removal
    INSERT INTO group_member_removals (
        group_id, 
        removed_user_id, 
        removed_by_user_id, 
        removal_type, 
        removal_reason
    ) VALUES (
        p_group_id, 
        p_user_id, 
        p_removed_by, 
        'group', 
        p_reason
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely remove user from channel with logging
CREATE OR REPLACE FUNCTION remove_user_from_channel(
    p_channel_id UUID,
    p_user_id UUID,
    p_removed_by UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    channel_creator UUID;
BEGIN
    -- Check if the person removing is the channel creator
    SELECT creator_id INTO channel_creator FROM channels WHERE id = p_channel_id;
    
    IF channel_creator != p_removed_by THEN
        RAISE EXCEPTION 'Only channel creator can remove members';
    END IF;
    
    -- Remove from channel_members
    DELETE FROM channel_members 
    WHERE channel_id = p_channel_id AND user_id = p_user_id;
    
    -- Log the removal
    INSERT INTO group_member_removals (
        channel_id, 
        removed_user_id, 
        removed_by_user_id, 
        removal_type, 
        removal_reason
    ) VALUES (
        p_channel_id, 
        p_user_id, 
        p_removed_by, 
        'channel', 
        p_reason
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;