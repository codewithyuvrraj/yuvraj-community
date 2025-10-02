-- Online Status Tracking for Groups
-- This SQL creates the necessary functions and triggers for real-time online status tracking

-- Function to get online members for a specific group
CREATE OR REPLACE FUNCTION get_group_online_members(group_id_param UUID)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    full_name TEXT,
    is_online BOOLEAN,
    last_seen TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gm.user_id,
        p.username,
        p.full_name,
        COALESCE(us.is_online, false) as is_online,
        us.last_seen
    FROM group_members gm
    JOIN profiles p ON gm.user_id = p.id
    LEFT JOIN user_status us ON gm.user_id = us.user_id
    WHERE gm.group_id = group_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a group has any online members (excluding current user)
CREATE OR REPLACE FUNCTION group_has_online_members(group_id_param UUID, current_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    online_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO online_count
    FROM group_members gm
    JOIN user_status us ON gm.user_id = us.user_id
    WHERE gm.group_id = group_id_param
    AND gm.user_id != current_user_id
    AND us.is_online = true
    AND us.last_seen > NOW() - INTERVAL '2 minutes';
    
    RETURN online_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user online status
CREATE OR REPLACE FUNCTION update_user_online_status(user_id_param UUID, is_online_param BOOLEAN)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_status (user_id, is_online, last_seen, updated_at)
    VALUES (user_id_param, is_online_param, NOW(), NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
        is_online = is_online_param,
        last_seen = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all groups with online status for a user
CREATE OR REPLACE FUNCTION get_user_groups_with_online_status(user_id_param UUID)
RETURNS TABLE (
    group_id UUID,
    group_name TEXT,
    group_description TEXT,
    has_online_members BOOLEAN,
    member_count INTEGER,
    online_member_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id as group_id,
        g.name as group_name,
        g.description as group_description,
        group_has_online_members(g.id, user_id_param) as has_online_members,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id)::INTEGER as member_count,
        (SELECT COUNT(*) 
         FROM group_members gm2 
         JOIN user_status us2 ON gm2.user_id = us2.user_id 
         WHERE gm2.group_id = g.id 
         AND gm2.user_id != user_id_param 
         AND us2.is_online = true 
         AND us2.last_seen > NOW() - INTERVAL '2 minutes')::INTEGER as online_member_count
    FROM groups g
    JOIN group_members gm ON g.id = gm.group_id
    WHERE gm.user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update last_seen when user goes offline
CREATE OR REPLACE FUNCTION update_last_seen_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_online = false AND OLD.is_online = true THEN
        NEW.last_seen = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_last_seen_on_offline ON user_status;
CREATE TRIGGER update_last_seen_on_offline
    BEFORE UPDATE ON user_status
    FOR EACH ROW
    EXECUTE FUNCTION update_last_seen_trigger();

-- Function to get groups where user was added by others (not created by user)
CREATE OR REPLACE FUNCTION get_user_joined_groups(user_id_param UUID)
RETURNS TABLE (
    group_id UUID,
    group_name TEXT,
    group_description TEXT,
    creator_name TEXT,
    joined_at TIMESTAMP WITH TIME ZONE,
    has_online_members BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id as group_id,
        g.name as group_name,
        g.description as group_description,
        p.full_name as creator_name,
        gm.created_at as joined_at,
        group_has_online_members(g.id, user_id_param) as has_online_members
    FROM groups g
    JOIN group_members gm ON g.id = gm.group_id
    JOIN profiles p ON g.creator_id = p.id
    WHERE gm.user_id = user_id_param
    AND g.creator_id != user_id_param
    ORDER BY gm.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get channels where user was added by others (not created by user)
CREATE OR REPLACE FUNCTION get_user_joined_channels(user_id_param UUID)
RETURNS TABLE (
    channel_id UUID,
    channel_name TEXT,
    channel_description TEXT,
    creator_name TEXT,
    joined_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as channel_id,
        c.name as channel_name,
        c.description as channel_description,
        p.full_name as creator_name,
        cm.created_at as joined_at
    FROM channels c
    JOIN channel_members cm ON c.id = cm.channel_id
    JOIN profiles p ON c.creator_id = p.id
    WHERE cm.user_id = user_id_param
    AND c.creator_id != user_id_param
    ORDER BY cm.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_group_online_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION group_has_online_members(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_online_status(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_groups_with_online_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_joined_groups(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_joined_channels(UUID) TO authenticated;