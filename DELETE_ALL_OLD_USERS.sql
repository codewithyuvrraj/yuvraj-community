-- Nuclear option: Delete ALL users and data
DELETE FROM follows;
DELETE FROM messages;
DELETE FROM profiles;

-- Or keep only users updated in last 7 days
-- DELETE FROM profiles WHERE updated_at < NOW() - INTERVAL '7 days';