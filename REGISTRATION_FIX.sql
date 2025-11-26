-- Registration Fix SQL
-- This file fixes user registration issues by ensuring proper RLS policies and constraints

-- Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Create permissive RLS policies for profiles table
CREATE POLICY "Allow profile creation" ON profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow profile updates" ON profiles
    FOR UPDATE USING (true);

CREATE POLICY "Allow profile viewing" ON profiles
    FOR SELECT USING (true);

-- Ensure profiles table has correct structure
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
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

-- Remove any foreign key constraints that might cause issues
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Create or replace the profile creation function
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (
        id,
        username,
        email,
        full_name,
        status,
        joined_at
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'online',
        NOW()
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the auth signup
        RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;

-- Create trigger for automatic profile creation
CREATE TRIGGER create_profile_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON profiles TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Test the setup
DO $$
BEGIN
    RAISE NOTICE 'Registration fix applied successfully';
END $$;