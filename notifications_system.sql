-- Create notifications table for follow events
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Function to create follow notification
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert notification for the user being followed
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
        NEW.following_id,
        'follow',
        'New Follower',
        (SELECT full_name FROM profiles WHERE id = NEW.follower_id) || ' started following you',
        jsonb_build_object(
            'follower_id', NEW.follower_id,
            'follower_name', (SELECT full_name FROM profiles WHERE id = NEW.follower_id),
            'follower_username', (SELECT username FROM profiles WHERE id = NEW.follower_id),
            'follower_photo', (SELECT profile_photo FROM profiles WHERE id = NEW.follower_id)
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for follow notifications
DROP TRIGGER IF EXISTS follow_notification_trigger ON follows;
CREATE TRIGGER follow_notification_trigger
    AFTER INSERT ON follows
    FOR EACH ROW
    EXECUTE FUNCTION create_follow_notification();

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM notifications
        WHERE notifications.user_id = get_unread_notification_count.user_id
        AND read = FALSE
    );
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications
    SET read = TRUE
    WHERE id = notification_id AND notifications.user_id = mark_notification_read.user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notifications
    SET read = TRUE
    WHERE notifications.user_id = mark_all_notifications_read.user_id
    AND read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;