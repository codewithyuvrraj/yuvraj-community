-- ============================================
-- NHOST SCHEMA - YUVRAJ COMMUNITY
-- Complete database schema for Nhost PostgreSQL
-- ============================================

-- ================
-- USERS & AUTH TABLES
-- ================

CREATE TABLE users (
    id UUID PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    followers_count INT DEFAULT 0,
    following_count INT DEFAULT 0,
    posts_count INT DEFAULT 0,
    reels_count INT DEFAULT 0,
    gender TEXT,
    dob DATE,
    website TEXT,
    location TEXT
);

-- ===================
-- FOLLOWERS TABLE
-- ===================

CREATE TABLE followers (
    id SERIAL PRIMARY KEY,
    follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE(follower_id, following_id)
);

-- ===================
-- POSTS + REELS
-- ===================

CREATE TABLE posts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    media_url TEXT,
    caption TEXT,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE reels (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    video_url TEXT,
    music_url TEXT,
    caption TEXT,
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT now()
);

-- ===================
-- COMMENTS
-- ===================

CREATE TABLE comments (
    id UUID PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

-- ===================
-- CHAT SYSTEM
-- ===================

CREATE TABLE conversations (
    id UUID PRIMARY KEY,
    is_group BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE conversation_users (
    id SERIAL PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT now()
);

CREATE TABLE messages (
    id UUID PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    text TEXT,
    media_url TEXT,
    message_type TEXT, -- text, image, reel, post, etc
    created_at TIMESTAMP DEFAULT now(),
    deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE deleted_conversations (
    id SERIAL PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id),
    user_id UUID REFERENCES users(id),
    deleted_at TIMESTAMP DEFAULT now()
);

-- ==========================
-- GROUP CHAT / CHANNEL SYSTEM
-- ==========================

CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    photo_url TEXT,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE group_members (
    id SERIAL PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- admin, member
    joined_at TIMESTAMP DEFAULT now(),
    UNIQUE(group_id, user_id)
);

CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    photo_url TEXT,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE channel_members (
    id SERIAL PRIMARY KEY,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'subscriber', -- admin, subscriber
    joined_at TIMESTAMP DEFAULT now(),
    UNIQUE(channel_id, user_id)
);

-- ===================
-- CHAT LOCK TABLE
-- ===================

CREATE TABLE chat_lock (
    id SERIAL PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMP DEFAULT now()
);

-- ===========================
-- TRIGGERS AND FUNCTIONS
-- ===========================

-- AUTO-UPDATE updated_at ON USER UPDATE
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_timestamp
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- AUTO-INCREMENT FOLLOWER COUNTS
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update follower count for the user being followed
    UPDATE user_profiles
    SET followers_count = (SELECT count(*) FROM followers WHERE following_id = NEW.following_id)
    WHERE user_id = NEW.following_id;
    
    -- Update following count for the user doing the following
    UPDATE user_profiles
    SET following_count = (SELECT count(*) FROM followers WHERE follower_id = NEW.follower_id)
    WHERE user_id = NEW.follower_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_follow_counts
AFTER INSERT ON followers
FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- AUTO-DECREMENT FOLLOWER COUNTS ON UNFOLLOW
CREATE OR REPLACE FUNCTION update_unfollow_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update follower count for the user being unfollowed
    UPDATE user_profiles
    SET followers_count = (SELECT count(*) FROM followers WHERE following_id = OLD.following_id)
    WHERE user_id = OLD.following_id;
    
    -- Update following count for the user doing the unfollowing
    UPDATE user_profiles
    SET following_count = (SELECT count(*) FROM followers WHERE follower_id = OLD.follower_id)
    WHERE user_id = OLD.follower_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_unfollow_counts
AFTER DELETE ON followers
FOR EACH ROW EXECUTE FUNCTION update_unfollow_counts();

-- ============================
-- CLEANUP FUNCTIONS
-- ============================

-- Remove users without activity
CREATE OR REPLACE FUNCTION delete_inactive_users()
RETURNS VOID AS $$
BEGIN
    DELETE FROM users
    WHERE id IN (
        SELECT u.id FROM users u
        LEFT JOIN posts p ON p.user_id = u.id
        LEFT JOIN reels r ON r.user_id = u.id
        LEFT JOIN followers f ON f.follower_id = u.id OR f.following_id = u.id
        WHERE p.id IS NULL AND r.id IS NULL AND f.id IS NULL
        AND u.created_at < now() - INTERVAL '30 days'
    );
END;
$$ LANGUAGE plpgsql;

-- Fix missing group/channel photos
UPDATE groups SET photo_url = 'default_group.jpg' WHERE photo_url IS NULL;
UPDATE channels SET photo_url = 'default_channel.jpg' WHERE photo_url IS NULL;

-- ============================
-- INDEXES FOR PERFORMANCE
-- ============================

-- User lookup indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);

-- Follower relationship indexes
CREATE INDEX idx_followers_follower_id ON followers(follower_id);
CREATE INDEX idx_followers_following_id ON followers(following_id);
CREATE INDEX idx_followers_created_at ON followers(created_at);

-- Message indexes
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Group indexes
CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);

-- Channel indexes
CREATE INDEX idx_channels_created_by ON channels(created_by);
CREATE INDEX idx_channel_members_channel_id ON channel_members(channel_id);
CREATE INDEX idx_channel_members_user_id ON channel_members(user_id);

-- ============================
-- SAMPLE DATA (OPTIONAL)
-- ============================

-- Insert sample user profiles for existing users
INSERT INTO user_profiles (user_id, followers_count, following_count, posts_count, reels_count)
SELECT id, 0, 0, 0, 0 FROM users
ON CONFLICT (user_id) DO NOTHING;

-- =======================================
-- END OF NHOST SCHEMA
-- =======================================