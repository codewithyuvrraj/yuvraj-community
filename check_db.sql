-- Check what's actually in the profiles table
SELECT id, username, full_name, email 
FROM profiles 
LIMIT 20;

-- Check for any null or empty usernames
SELECT COUNT(*) as total_users FROM profiles;
SELECT COUNT(*) as users_with_username FROM profiles WHERE username IS NOT NULL AND username != '';
SELECT COUNT(*) as users_with_fullname FROM profiles WHERE full_name IS NOT NULL AND full_name != '';

-- Check for duplicate or problematic entries
SELECT username, COUNT(*) as count 
FROM profiles 
WHERE username IS NOT NULL 
GROUP BY username 
HAVING COUNT(*) > 1;