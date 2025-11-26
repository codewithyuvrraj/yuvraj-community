-- Enable real-time for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Create a function to notify on message insert
CREATE OR REPLACE FUNCTION notify_message_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('message_inserted', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for real-time notifications
DROP TRIGGER IF EXISTS message_insert_trigger ON messages;
CREATE TRIGGER message_insert_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_message_insert();