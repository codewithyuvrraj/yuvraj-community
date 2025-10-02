-- Influencer Button State Fix
-- This SQL ensures the influencer business mode is properly stored and retrieved

-- Ensure the column exists with proper default
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_influencer_business BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS influencer_activated_at TIMESTAMPTZ;

-- Update any existing users to have proper boolean values
UPDATE profiles 
SET is_influencer_business = COALESCE(is_influencer_business, false)
WHERE is_influencer_business IS NULL;

-- Create function to get user with influencer status
CREATE OR REPLACE FUNCTION get_user_with_influencer_status(user_id UUID)
RETURNS TABLE (
    id UUID,
    username TEXT,
    email TEXT,
    full_name TEXT,
    status TEXT,
    joined_at TIMESTAMPTZ,
    bio TEXT,
    job_title TEXT,
    company TEXT,
    industry TEXT,
    business_hours TEXT,
    timezone TEXT,
    auto_reply TEXT,
    profile_photo TEXT,
    is_influencer_business BOOLEAN,
    influencer_activated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.email,
        p.full_name,
        p.status,
        p.joined_at,
        p.bio,
        p.job_title,
        p.company,
        p.industry,
        p.business_hours,
        p.timezone,
        p.auto_reply,
        p.profile_photo,
        COALESCE(p.is_influencer_business, false) as is_influencer_business,
        p.influencer_activated_at
    FROM profiles p
    WHERE p.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_with_influencer_status(UUID) TO anon, authenticated;

-- Verify the setup
DO $$
BEGIN
    RAISE NOTICE 'Influencer button fix applied successfully';
    RAISE NOTICE 'Column exists: %', (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_influencer_business'));
END $$;