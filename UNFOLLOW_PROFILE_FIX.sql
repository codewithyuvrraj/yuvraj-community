-- UNFOLLOW PROFILE FIX
-- Add unfollow button to profile view and remove from messages after unfollow

-- 1. Create function to check if user is following another user
CREATE OR REPLACE FUNCTION is_following(follower_id UUID, following_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM follows 
        WHERE follower_id = $1 AND following_id = $2
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create function to get user profile with follow status
CREATE OR REPLACE FUNCTION get_user_profile_with_follow_status(
    profile_user_id UUID, 
    current_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    username TEXT,
    full_name TEXT,
    email TEXT,
    profile_photo TEXT,
    job_title TEXT,
    company TEXT,
    industry TEXT,
    bio TEXT,
    business_hours TEXT,
    is_following BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.full_name,
        p.email,
        p.profile_photo,
        p.job_title,
        p.company,
        p.industry,
        p.bio,
        p.business_hours,
        CASE 
            WHEN current_user_id IS NULL THEN FALSE
            ELSE is_following(current_user_id, profile_user_id)
        END as is_following,
        p.created_at
    FROM profiles p
    WHERE p.id = profile_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION is_following(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile_with_follow_status(UUID, UUID) TO anon, authenticated;

-- Success message
SELECT 'Profile follow status functions created successfully!' as message;