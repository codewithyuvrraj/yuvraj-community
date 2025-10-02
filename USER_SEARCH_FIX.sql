-- USER SEARCH FIX
-- This SQL file fixes user search functionality

-- 1. Create search function for better performance
CREATE OR REPLACE FUNCTION search_users(search_query TEXT, current_user_id UUID DEFAULT NULL)
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
        p.created_at
    FROM profiles p
    WHERE 
        (current_user_id IS NULL OR p.id != current_user_id)
        AND (
            p.username ILIKE '%' || search_query || '%' OR
            p.full_name ILIKE '%' || search_query || '%' OR
            p.email ILIKE '%' || search_query || '%' OR
            p.job_title ILIKE '%' || search_query || '%' OR
            p.company ILIKE '%' || search_query || '%'
        )
    ORDER BY 
        CASE 
            WHEN p.username ILIKE search_query || '%' THEN 1
            WHEN p.full_name ILIKE search_query || '%' THEN 2
            ELSE 3
        END,
        p.created_at DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create function to get all users
CREATE OR REPLACE FUNCTION get_all_users(current_user_id UUID DEFAULT NULL)
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
        p.created_at
    FROM profiles p
    WHERE (current_user_id IS NULL OR p.id != current_user_id)
    ORDER BY p.created_at DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant execute permissions
GRANT EXECUTE ON FUNCTION search_users(TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_all_users(UUID) TO anon, authenticated;

-- 4. Update RLS policies for better access
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

-- 5. Create simple indexes for search performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles (username);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles (full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);

-- 6. Create sample users if none exist
INSERT INTO profiles (id, username, full_name, email, job_title, company, industry, bio)
SELECT 
    gen_random_uuid(),
    'demo_user_' || generate_series,
    'Demo User ' || generate_series,
    'demo' || generate_series || '@example.com',
    CASE (generate_series % 4)
        WHEN 0 THEN 'Software Engineer'
        WHEN 1 THEN 'Product Manager'
        WHEN 2 THEN 'Marketing Director'
        ELSE 'Business Analyst'
    END,
    CASE (generate_series % 3)
        WHEN 0 THEN 'Tech Corp'
        WHEN 1 THEN 'Innovation Inc'
        ELSE 'Growth Co'
    END,
    'Technology',
    'Professional with expertise in business and technology.'
FROM generate_series(1, 10)
WHERE NOT EXISTS (SELECT 1 FROM profiles LIMIT 1);

-- Success message
SELECT 'User search functionality has been fixed and optimized!' as message;