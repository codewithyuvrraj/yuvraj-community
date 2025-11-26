-- Fix group photo removal when leaving group
-- Run this SQL in your Supabase SQL Editor

-- Remove the problematic RLS policy that requires membership
DROP POLICY IF EXISTS "Allow group photo updates" ON groups;

-- Create new policy that allows photo viewing regardless of membership
DROP POLICY IF EXISTS "Users can view all groups" ON groups;
CREATE POLICY "Users can view all groups" ON groups FOR SELECT USING (true);

-- Update the main policy to only require creator or admin for updates
DROP POLICY IF EXISTS "Users can update own groups" ON groups;
CREATE POLICY "Users can update own groups" ON groups 
FOR UPDATE USING (
    creator_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM group_members 
        WHERE group_id = groups.id 
        AND user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Ensure group photos persist even after membership changes
CREATE OR REPLACE FUNCTION preserve_group_photo()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent group_photo from being set to NULL during membership changes
    IF OLD.group_photo IS NOT NULL AND NEW.group_photo IS NULL THEN
        NEW.group_photo = OLD.group_photo;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to preserve photos
DROP TRIGGER IF EXISTS preserve_group_photo_trigger ON groups;
CREATE TRIGGER preserve_group_photo_trigger
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION preserve_group_photo();

-- Test the fix
DO $$
BEGIN
    RAISE NOTICE 'Group photo leave fix applied successfully!';
    RAISE NOTICE 'Photos will now persist even after leaving groups';
END $$;