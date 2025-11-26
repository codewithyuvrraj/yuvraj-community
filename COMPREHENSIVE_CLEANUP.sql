-- 1. Delete users with missing or invalid data
DELETE FROM profiles
WHERE username IS NULL 
   OR username = '' 
   OR full_name IS NULL 
   OR full_name = '' 
   OR email IS NULL 
   OR email = '';

-- 2. Delete users who have not logged in / updated for a long time (example: 6 months)
DELETE FROM profiles
WHERE updated_at < NOW() - INTERVAL '6 months';

-- 3. Delete duplicate users (keep the most recent one)
DELETE FROM profiles p
USING profiles p2
WHERE p.username = p2.username
  AND p.id < p2.id;

-- 4. Delete orphaned follows
DELETE FROM follows
WHERE follower_id NOT IN (SELECT id FROM profiles)
   OR following_id NOT IN (SELECT id FROM profiles);

-- 5. Delete orphaned messages
DELETE FROM messages
WHERE sender_id NOT IN (SELECT id FROM profiles);

-- 6. Optional: delete users without any connections (no follows, no messages)
DELETE FROM profiles
WHERE id NOT IN (SELECT follower_id FROM follows)
  AND id NOT IN (SELECT following_id FROM follows)
  AND id NOT IN (SELECT sender_id FROM messages);