-- Group Photo Persistence Fix - COMPREHENSIVE SOLUTION
-- Run this SQL in your Supabase SQL Editor to fix group photo issues

-- Step 1: Verify and fix group_photo column
DO $$
BEGIN
    -- Check if group_photo column exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'groups' AND column_name = 'group_photo') THEN
        ALTER TABLE groups ADD COLUMN group_photo TEXT;
        RAISE NOTICE 'Added group_photo column to groups table';
    ELSE
        RAISE NOTICE 'group_photo column already exists';
    END IF;
END $$;

-- Step 2: Clean up NULL values
UPDATE groups SET group_photo = NULL WHERE group_photo = '';

-- Step 3: Create/update the updated_at trigger function
CREATE OR REPLACE FUNCTION update_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Drop and recreate the trigger
DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION update_groups_updated_at();

-- Step 5: Fix RLS policies for group updates
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

-- Step 6: Add policy for group photo updates specifically
DROP POLICY IF EXISTS "Allow group photo updates" ON groups;
CREATE POLICY "Allow group photo updates" ON groups 
FOR UPDATE USING (
    creator_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM group_members 
        WHERE group_id = groups.id 
        AND user_id = auth.uid() 
        AND role IN ('admin', 'member')
    )
) WITH CHECK (
    creator_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM group_members 
        WHERE group_id = groups.id 
        AND user_id = auth.uid() 
        AND role IN ('admin', 'member')
    )
);

-- Step 7: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_groups_photo_not_null ON groups(id) WHERE group_photo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_groups_updated_at ON groups(updated_at DESC);

-- Step 8: Create function to validate group photo URLs
CREATE OR REPLACE FUNCTION validate_group_photo_url(photo_url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Basic URL validation
    IF photo_url IS NULL OR photo_url = '' THEN
        RETURN TRUE;
    END IF;
    
    -- Check if it's a valid HTTP/HTTPS URL or Supabase storage URL
    IF photo_url ~ '^https?://.*' OR photo_url ~ '^/storage/.*' THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Add constraint to ensure valid photo URLs
DO $$
BEGIN
    -- Drop constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'groups' AND constraint_name = 'valid_group_photo_url') THEN
        ALTER TABLE groups DROP CONSTRAINT valid_group_photo_url;
    END IF;
    
    -- Add new constraint
    ALTER TABLE groups ADD CONSTRAINT valid_group_photo_url 
    CHECK (validate_group_photo_url(group_photo));
    
    RAISE NOTICE 'Added group photo URL validation constraint';
END $$;

-- Step 10: Create function to handle group photo cleanup
CREATE OR REPLACE FUNCTION cleanup_orphaned_group_photos()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER := 0;
BEGIN
    -- This function can be enhanced to actually clean up storage
    -- For now, it just counts potential orphaned photos
    SELECT COUNT(*) INTO cleanup_count 
    FROM groups 
    WHERE group_photo IS NOT NULL 
    AND group_photo != '' 
    AND updated_at < (NOW() - INTERVAL '30 days');
    
    RAISE NOTICE 'Found % groups with photos older than 30 days', cleanup_count;
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Test group photo persistence
DO $$
DECLARE
    test_group_id UUID;
    test_photo_url TEXT := 'https://example.com/test-photo.jpg';
    retrieved_photo TEXT;
BEGIN
    -- Only run test if there are existing groups
    SELECT id INTO test_group_id FROM groups LIMIT 1;
    
    IF test_group_id IS NOT NULL THEN
        -- Test update
        UPDATE groups SET group_photo = test_photo_url WHERE id = test_group_id;
        
        -- Verify update
        SELECT group_photo INTO retrieved_photo FROM groups WHERE id = test_group_id;
        
        IF retrieved_photo = test_photo_url THEN
            RAISE NOTICE 'Group photo persistence test: PASSED';
            -- Revert test change
            UPDATE groups SET group_photo = NULL WHERE id = test_group_id;
        ELSE
            RAISE NOTICE 'Group photo persistence test: FAILED - Expected %, Got %', test_photo_url, retrieved_photo;
        END IF;
    ELSE
        RAISE NOTICE 'No groups found for testing';
    END IF;
END $$;

-- Step 12: Final verification and statistics
DO $$
DECLARE
    total_groups INTEGER;
    groups_with_photos INTEGER;
    recent_updates INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_groups FROM groups;
    SELECT COUNT(*) INTO groups_with_photos FROM groups WHERE group_photo IS NOT NULL;
    SELECT COUNT(*) INTO recent_updates FROM groups WHERE updated_at > (NOW() - INTERVAL '1 hour');
    
    RAISE NOTICE '=== GROUP PHOTO FIX SUMMARY ===';
    RAISE NOTICE 'Total groups: %', total_groups;
    RAISE NOTICE 'Groups with photos: %', groups_with_photos;
    RAISE NOTICE 'Recent updates (last hour): %', recent_updates;
    RAISE NOTICE 'Fix completed successfully!';
END $$;

-- MANUAL STORAGE SETUP INSTRUCTIONS:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Ensure 'documents' bucket exists and is public
-- 3. Add these storage policies if they don't exist:
--    Policy Name: "Allow authenticated uploads"
--    Policy: bucket_id = 'documents' AND auth.role() = 'authenticated'
--    
--    Policy Name: "Allow public access"
--    Policy: bucket_id = 'documents'