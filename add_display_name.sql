-- Add display_name column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Update existing users to use full_name as display_name if not set
UPDATE profiles 
SET display_name = full_name 
WHERE display_name IS NULL AND full_name IS NOT NULL;

-- Create index for better performance on display_name searches
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

-- Update RLS policies to include display_name in selectable fields
-- (This ensures display_name is accessible in queries)