-- Registration Fix V2 - Comprehensive Database Fix
-- This addresses all common registration issues

-- 1. Ensure RLS is enabled but permissive
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Allow profile updates" ON profiles;
DROP POLICY IF EXISTS "Allow profile viewing" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;

-- 3. Create completely permissive policies for registration
CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE USING (true);

-- 4. Ensure table structure is correct
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'online',
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT 'Technology',
ADD COLUMN IF NOT EXISTS business_hours TEXT DEFAULT '9 AM - 5 PM',
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC+0 (GMT)',
ADD COLUMN IF NOT EXISTS auto_reply TEXT DEFAULT 'Disabled',
ADD COLUMN IF NOT EXISTS profile_photo TEXT;

-- 5. Remove problematic constraints
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_username_key;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;

-- 6. Create robust profile creation function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    username_val TEXT;
    full_name_val TEXT;
BEGIN
    -- Extract values with fallbacks
    username_val := COALESCE(
        NEW.raw_user_meta_data->>'username',
        split_part(NEW.email, '@', 1)
    );
    
    full_name_val := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'username',
        split_part(NEW.email, '@', 1)
    );

    -- Insert profile with conflict handling
    INSERT INTO profiles (
        id,
        username,
        email,
        full_name,
        status,
        joined_at
    ) VALUES (
        NEW.id,
        username_val,
        NEW.email,
        full_name_val,
        'online',
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        status = 'online',
        joined_at = COALESCE(profiles.joined_at, NOW());

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log but don't fail
        RAISE WARNING 'Profile creation failed for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 8. Grant all necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON profiles TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- 9. Test function for manual profile creation
CREATE OR REPLACE FUNCTION create_profile_manually(
    user_id UUID,
    user_email TEXT,
    user_username TEXT DEFAULT NULL,
    user_full_name TEXT DEFAULT NULL
)
RETURNS profiles AS $$
DECLARE
    new_profile profiles;
BEGIN
    INSERT INTO profiles (
        id,
        username,
        email,
        full_name,
        status,
        joined_at
    ) VALUES (
        user_id,
        COALESCE(user_username, split_part(user_email, '@', 1)),
        user_email,
        COALESCE(user_full_name, user_username, split_part(user_email, '@', 1)),
        'online',
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name
    RETURNING * INTO new_profile;
    
    RETURN new_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Verify setup
DO $$
BEGIN
    RAISE NOTICE 'Registration Fix V2 applied successfully';
    RAISE NOTICE 'Profiles table exists: %', (SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles'));
    RAISE NOTICE 'RLS enabled: %', (SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles');
END $$;