-- Group Members Table for storing group membership
CREATE TABLE IF NOT EXISTS group_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL,
    user_id UUID NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    role VARCHAR(20) DEFAULT 'member'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);

-- Unique constraint to prevent duplicate memberships
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_members_unique ON group_members(group_id, user_id);

-- Enable RLS
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- RLS policy - allow authenticated users to view and manage
CREATE POLICY "Allow authenticated users" ON group_members
    FOR ALL USING (auth.role() = 'authenticated');

-- Function to get group members with profile info
CREATE OR REPLACE FUNCTION get_group_members_with_profiles(group_id_param UUID)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    username TEXT,
    profile_photo TEXT,
    job_title TEXT,
    company TEXT,
    joined_at TIMESTAMP WITH TIME ZONE,
    role TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gm.user_id,
        p.full_name,
        p.username,
        p.profile_photo,
        p.job_title,
        p.company,
        gm.joined_at,
        gm.role
    FROM group_members gm
    JOIN profiles p ON gm.user_id = p.id
    WHERE gm.group_id = group_id_param
    ORDER BY gm.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON group_members TO authenticated;
GRANT EXECUTE ON FUNCTION get_group_members_with_profiles(UUID) TO authenticated;