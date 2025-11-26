-- Group Photo Persistence Fix
-- Run this SQL in your Supabase SQL Editor to fix group photo issues

-- Ensure group_photo column exists and has proper type
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS group_photo TEXT;

-- Update existing groups with NULL group_photo to empty string for consistency
UPDATE groups 
SET group_photo = '' 
WHERE group_photo IS NULL;

-- Create function to update group updated_at timestamp
CREATE OR REPLACE FUNCTION update_group_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at when group is modified
DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION update_group_updated_at();

-- Ensure proper RLS policies for group photo updates
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

-- Create index for better performance on group photo queries
CREATE INDEX IF NOT EXISTS idx_groups_photo ON groups(group_photo) WHERE group_photo IS NOT NULL AND group_photo != '';

-- Function to clean up orphaned group photos from storage
CREATE OR REPLACE FUNCTION cleanup_group_photos()
RETURNS void AS $$
BEGIN
    -- This function can be called periodically to clean up unused photos
    -- Implementation depends on your storage cleanup strategy
    RAISE NOTICE 'Group photo cleanup function created';
END;
$$ LANGUAGE plpgsql;

-- Storage bucket setup (run manually in Supabase Dashboard > Storage)
-- 1. Create bucket named 'documents' if it doesn't exist
-- 2. Set bucket to public
-- 3. Add these policies in Storage > Policies:
--    - Allow authenticated uploads: auth.role() = 'authenticated'
--    - Allow public access: true

-- Verify group photo data integrity
DO $$
DECLARE
    group_count INTEGER;
    photo_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO group_count FROM groups;
    SELECT COUNT(*) INTO photo_count FROM groups WHERE group_photo IS NOT NULL AND group_photo != '';
    
    RAISE NOTICE 'Total groups: %, Groups with photos: %', group_count, photo_count;
END $$;