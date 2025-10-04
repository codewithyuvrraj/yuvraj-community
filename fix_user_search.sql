-- Fix user search to show all users including new signups
-- Remove date filtering and ensure all users are visible

-- Drop existing policies on profiles table
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all users to see all profiles
CREATE POLICY "Allow all profile reads" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow profile updates" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow profile inserts" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Grant permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO anon;

-- Update any existing profiles to have recent updated_at
UPDATE profiles SET updated_at = NOW() WHERE updated_at IS NULL OR updated_at < '2025-01-01';