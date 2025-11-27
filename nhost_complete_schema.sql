-- ============================================
-- NHOST COMPLETE SCHEMA - BUSINESSCONNECT
-- Complete database schema for Nhost PostgreSQL with Hasura
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================
-- USERS & AUTH TABLES
-- ================

-- Main users table (works with Nhost Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    job_title TEXT,
    company TEXT,
    industry TEXT DEFAULT 'Technology',
    business_hours TEXT DEFAULT '9 AM - 5 PM',
    timezone TEXT DEFAULT 'UTC+0 (GMT)',
    auto_reply TEXT DEFAULT 'Disabled',
    is_influencer_business BOOLEAN DEFAULT FALSE,
    influencer_activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT TRUE
);

-- User profiles for additional data
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    followers_count INT DEFAULT 0,
    following_count INT DEFAULT 0,
    posts_count INT DEFAULT 0,
    reels_count INT DEFAULT 0,
    gender TEXT,
    dob DATE,
    website TEXT,
    location TEXT,
    profile_views_total INT DEFAULT 0,
    profile_views_today INT DEFAULT 0,
    profile_views_week INT DEFAULT 0,
    last_seen TIMESTAMPTZ DEFAULT now(),
    is_online BOOLEAN DEFAULT FALSE
);

-- ===================
-- FOLLOWERS TABLE
-- ===================

CREATE TABLE followers (
    id SERIAL PRIMARY KEY,
    follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(follower_id, following_id)
);

-- ===================
-- POSTS + REELS
-- ===================

CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    media_url TEXT,
    caption TEXT,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    video_url TEXT,
    music_url TEXT,
    caption TEXT,
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ===================
-- COMMENTS
-- ===================

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ===================
-- CHAT SYSTEM
-- ===================

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_group BOOLEAN DEFAULT FALSE,
    name TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE conversation_participants (
    id SERIAL PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT now(),
    left_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(conversation_id, user_id)
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    content TEXT,
    message_type TEXT DEFAULT 'text', -- text, image, file, system
    file_url TEXT,
    file_name TEXT,
    file_size BIGINT,
    reply_to_message_id UUID REFERENCES messages(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);

-- Message read status
CREATE TABLE message_reads (
    id SERIAL PRIMARY KEY,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(message_id, user_id)
);

-- Deleted conversations per user
CREATE TABLE deleted_conversations (
    id SERIAL PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    deleted_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(conversation_id, user_id)
);

-- ==========================
-- GROUP CHAT SYSTEM
-- ==========================

CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    photo_url TEXT,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    is_private BOOLEAN DEFAULT FALSE,
    max_members INT DEFAULT 256,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE group_members (
    id SERIAL PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- admin, moderator, member
    added_by UUID REFERENCES users(id),
    joined_at TIMESTAMPTZ DEFAULT now(),
    left_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(group_id, user_id)
);

-- Group messages
CREATE TABLE group_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    content TEXT,
    message_type TEXT DEFAULT 'text',
    file_url TEXT,
    file_name TEXT,
    reply_to_message_id UUID REFERENCES group_messages(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- ==========================
-- CHANNEL SYSTEM
-- ==========================

CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    photo_url TEXT,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    is_private BOOLEAN DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE channel_members (
    id SERIAL PRIMARY KEY,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'subscriber', -- admin, moderator, subscriber
    joined_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(channel_id, user_id)
);

-- Channel join requests
CREATE TABLE channel_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    requested_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES users(id),
    UNIQUE(channel_id, user_id)
);

-- Channel messages (broadcasts)
CREATE TABLE channel_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    content TEXT,
    message_type TEXT DEFAULT 'text',
    file_url TEXT,
    file_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- ===================
-- NOTIFICATIONS SYSTEM
-- ===================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL, -- follow, message, group_add, channel_add, etc.
    title TEXT NOT NULL,
    content TEXT,
    data JSONB, -- Additional data like user_id, group_id, etc.
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ
);

-- ===================
-- CHAT LOCK SYSTEM
-- ===================

CREATE TABLE chat_locks (
    id SERIAL PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMPTZ DEFAULT now(),
    unlocked_at TIMESTAMPTZ,
    UNIQUE(conversation_id, user_id)
);

-- ===================
-- BUSINESS FEATURES
-- ===================

-- Analytics tracking
CREATE TABLE user_analytics (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL, -- profile_view, message_sent, connection_made
    metric_value INT DEFAULT 1,
    metadata JSONB,
    recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Business leads
CREATE TABLE business_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lead_name TEXT NOT NULL,
    lead_email TEXT,
    lead_company TEXT,
    status TEXT DEFAULT 'new', -- new, contacted, qualified, closed
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Meeting scheduler
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INT DEFAULT 30,
    meeting_url TEXT,
    status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================
-- FUNCTIONS AND TRIGGERS
-- ===========================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update follower counts
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update follower count for the user being followed
        UPDATE user_profiles 
        SET followers_count = (SELECT COUNT(*) FROM followers WHERE following_id = NEW.following_id)
        WHERE user_id = NEW.following_id;
        
        -- Update following count for the user doing the following
        UPDATE user_profiles 
        SET following_count = (SELECT COUNT(*) FROM followers WHERE follower_id = NEW.follower_id)
        WHERE user_id = NEW.follower_id;
        
        -- Create notification for the followed user
        INSERT INTO notifications (user_id, notification_type, title, content, data)
        VALUES (
            NEW.following_id,
            'follow',
            'New Follower',
            (SELECT full_name FROM users WHERE id = NEW.follower_id) || ' started following you',
            jsonb_build_object('follower_id', NEW.follower_id)
        );
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update follower count for the user being unfollowed
        UPDATE user_profiles 
        SET followers_count = (SELECT COUNT(*) FROM followers WHERE following_id = OLD.following_id)
        WHERE user_id = OLD.following_id;
        
        -- Update following count for the user doing the unfollowing
        UPDATE user_profiles 
        SET following_count = (SELECT COUNT(*) FROM followers WHERE follower_id = OLD.follower_id)
        WHERE user_id = OLD.follower_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER follower_counts_trigger
    AFTER INSERT OR DELETE ON followers
    FOR EACH ROW EXECUTE FUNCTION update_follower_counts();

-- Auto-create user profile when user is created
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_user_profile_trigger
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Update conversation timestamp when message is sent
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET updated_at = NEW.created_at 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_timestamp_trigger
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- ============================
-- INDEXES FOR PERFORMANCE
-- ============================

-- User indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Follower indexes
CREATE INDEX idx_followers_follower_id ON followers(follower_id);
CREATE INDEX idx_followers_following_id ON followers(following_id);
CREATE INDEX idx_followers_created_at ON followers(created_at);

-- Message indexes
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_is_deleted ON messages(is_deleted);

-- Group indexes
CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_members_is_active ON group_members(is_active);

-- Channel indexes
CREATE INDEX idx_channels_created_by ON channels(created_by);
CREATE INDEX idx_channel_members_channel_id ON channel_members(channel_id);
CREATE INDEX idx_channel_members_user_id ON channel_members(user_id);

-- Notification indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_type ON notifications(notification_type);

-- Analytics indexes
CREATE INDEX idx_user_analytics_user_id ON user_analytics(user_id);
CREATE INDEX idx_user_analytics_type ON user_analytics(metric_type);
CREATE INDEX idx_user_analytics_recorded_at ON user_analytics(recorded_at);

-- ============================
-- HASURA PERMISSIONS SETUP
-- ============================

-- Note: These would be set up in Hasura Console, but here's the structure:

-- Users table permissions:
-- - Select: Users can see all users (for discovery)
-- - Insert: Only authenticated users can insert their own profile
-- - Update: Users can only update their own profile
-- - Delete: Users can only delete their own profile

-- Messages permissions:
-- - Select: Users can only see messages in conversations they're part of
-- - Insert: Users can only send messages as themselves
-- - Update: Users can only edit their own messages
-- - Delete: Users can only delete their own messages

-- Groups/Channels permissions:
-- - Select: Members can see group/channel info and messages
-- - Insert: Any user can create groups/channels
-- - Update: Only creators and admins can update
-- - Delete: Only creators can delete

-- ============================
-- SAMPLE DATA FOR TESTING
-- ============================

-- Insert a demo user (password: demo123)
INSERT INTO users (id, username, full_name, email, bio, job_title, company, industry)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'demo',
    'Demo User',
    'demo@example.com',
    'Demo user for testing BusinessConnect platform',
    'CEO',
    'Demo Company',
    'Technology'
) ON CONFLICT (email) DO NOTHING;

-- ============================
-- CLEANUP FUNCTIONS
-- ============================

-- Clean up old notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS VOID AS $$
BEGIN
    DELETE FROM notifications 
    WHERE created_at < now() - INTERVAL '30 days' AND is_read = true;
END;
$$ LANGUAGE plpgsql;

-- Clean up deleted messages (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_deleted_messages()
RETURNS VOID AS $$
BEGIN
    DELETE FROM messages 
    WHERE is_deleted = true AND deleted_at < now() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- =======================================
-- END OF COMPLETE NHOST SCHEMA
-- =======================================

-- To apply this schema:
-- 1. Run this SQL in your Nhost database
-- 2. Set up Hasura permissions in the console
-- 3. Configure authentication rules
-- 4. Test with the demo user