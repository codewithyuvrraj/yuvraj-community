-- Enable replication for messages table
-- This must be run in Supabase SQL Editor

-- First, ensure the table is part of the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Grant necessary permissions for realtime
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;

-- Ensure RLS policies allow realtime access
-- (The existing policies should work, but let's be explicit)

-- Verify the publication includes our table
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'messages';