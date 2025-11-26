-- SQL to check if user has influencer business mode enabled
-- This function returns the current influencer status for a user

CREATE OR REPLACE FUNCTION check_influencer_status(user_id UUID)
RETURNS TABLE (
    is_influencer_business BOOLEAN,
    influencer_activated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(p.is_influencer_business, false) as is_influencer_business,
        p.influencer_activated_at
    FROM profiles p
    WHERE p.id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_influencer_status(UUID) TO authenticated;

-- Example usage:
-- SELECT * FROM check_influencer_status('your-user-id-here');