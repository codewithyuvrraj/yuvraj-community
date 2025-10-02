-- Check if messages table is in realtime publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'messages';

-- Grant permissions (safe to run multiple times)
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;