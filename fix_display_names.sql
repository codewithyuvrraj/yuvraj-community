-- Fix Display Names for Existing Users
-- This updates users who don't have display_name set

-- Update existing users to have display_name = full_name where display_name is null
UPDATE profiles 
SET display_name = full_name 
WHERE display_name IS NULL AND full_name IS NOT NULL;

-- Update users who have empty display_name
UPDATE profiles 
SET display_name = full_name 
WHERE (display_name = '' OR display_name IS NULL) AND full_name IS NOT NULL;

-- For users who don't have full_name either, use username
UPDATE profiles 
SET display_name = username 
WHERE (display_name = '' OR display_name IS NULL) AND username IS NOT NULL;

-- Update the profile creation function to include display_name
DROP FUNCTION IF EXISTS create_profile_manually(uuid,text,text,text);
CREATE FUNCTION create_profile_manually(
    user_id UUID,
    user_email TEXT,
    user_username TEXT,
    user_full_name TEXT
) RETURNS profiles AS $$
DECLARE
    new_profile profiles;
BEGIN
    INSERT INTO profiles (
        id, 
        email, 
        username, 
        full_name, 
        display_name,
        status, 
        joined_at
    ) VALUES (
        user_id,
        user_email,
        user_username,
        user_full_name,
        user_full_name,  -- Set display_name same as full_name
        'online',
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        display_name = EXCLUDED.display_name,
        updated_at = NOW()
    RETURNING * INTO new_profile;
    
    RETURN new_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;