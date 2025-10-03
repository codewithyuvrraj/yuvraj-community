-- Group Notifications Table
CREATE TABLE IF NOT EXISTS group_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    added_by_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('group_addition', 'channel_addition')),
    data JSONB NOT NULL DEFAULT '{}',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_notifications_user_id ON group_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_group_notifications_read ON group_notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_group_notifications_created_at ON group_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_notifications_type ON group_notifications(notification_type);

-- RLS Policies
ALTER TABLE group_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own group notifications" ON group_notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own group notifications" ON group_notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Anyone can insert notifications (for when users add others to groups)
CREATE POLICY "Anyone can insert group notifications" ON group_notifications
    FOR INSERT WITH CHECK (true);

-- Function to get unread group notifications count
CREATE OR REPLACE FUNCTION get_unread_group_notifications_count(user_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM group_notifications
        WHERE user_id = user_id_param AND read = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark group notification as read
CREATE OR REPLACE FUNCTION mark_group_notification_read(notification_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE group_notifications
    SET read = TRUE
    WHERE id = notification_id_param AND user_id = user_id_param;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all group notifications as read
CREATE OR REPLACE FUNCTION mark_all_group_notifications_read(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE group_notifications
    SET read = TRUE
    WHERE user_id = user_id_param AND read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;