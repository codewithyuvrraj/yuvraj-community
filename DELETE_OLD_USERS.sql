-- Hard delete old/invalid users from profiles table
DELETE FROM profiles 
WHERE username IS NULL 
   OR username = '' 
   OR full_name IS NULL 
   OR full_name = ''
   OR email IS NULL
   OR email = '';

-- Delete any orphaned follows
DELETE FROM follows 
WHERE follower_id NOT IN (SELECT id FROM profiles)
   OR following_id NOT IN (SELECT id FROM profiles);

-- Delete any orphaned messages  
DELETE FROM messages 
WHERE sender_id NOT IN (SELECT id FROM profiles);