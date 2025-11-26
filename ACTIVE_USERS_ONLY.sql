-- Function to get only active users (users that exist in profiles table)
CREATE OR REPLACE FUNCTION get_active_users(current_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    username TEXT,
    full_name TEXT,
    email TEXT,
    profile_photo TEXT,
    bio TEXT,
    job_title TEXT,
    company TEXT,
    industry TEXT,
    created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.full_name,
        p.email,
        p.profile_photo,
        p.bio,
        p.job_title,
        p.company,
        p.industry,
        p.created_at
    FROM profiles p
    WHERE p.id != COALESCE(current_user_id, '00000000-0000-0000-0000-000000000000'::UUID)
    ORDER BY p.created_at DESC
    LIMIT 100;
END;
$$;

-- Function to search only active users
CREATE OR REPLACE FUNCTION search_active_users(
    search_query TEXT,
    current_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    username TEXT,
    full_name TEXT,
    email TEXT,
    profile_photo TEXT,
    bio TEXT,
    job_title TEXT,
    company TEXT,
    industry TEXT,
    created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.full_name,
        p.email,
        p.profile_photo,
        p.bio,
        p.job_title,
        p.company,
        p.industry,
        p.created_at
    FROM profiles p
    WHERE p.id != COALESCE(current_user_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (
        p.username ILIKE '%' || search_query || '%' OR
        p.full_name ILIKE '%' || search_query || '%' OR
        p.email ILIKE '%' || search_query || '%'
    )
    ORDER BY p.created_at DESC
    LIMIT 50;
END;
$$;