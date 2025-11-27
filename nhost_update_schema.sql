-- ============================================
-- NHOST SCHEMA UPDATE - BUSINESSCONNECT
-- Incremental updates to existing schema
-- ============================================

-- Enable extensions if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================
-- UPDATE EXISTING USERS TABLE
-- ================

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT 'Technology';
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_hours TEXT DEFAULT '9 AM - 5 PM';
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC+0 (GMT)';
ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_reply TEXT DEFAULT 'Disabled';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_influencer_business BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS influencer_activated_at TIMESTAMPTZ;

-- Update user_profiles if exists, create if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
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
    ELSE
        -- Add missing columns to existing user_profiles
        ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_views_total INT DEFAULT 0;
        ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_views_today INT DEFAULT 0;
        ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_views_week INT DEFAULT 0;
        ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now();
        ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;
    END IF;
END
$$;

-- ================
-- CREATE MISSING TABLES
-- ================

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_group BOOLEAN DEFAULT FALSE,
    name TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Conversation participants
CREATE TABLE IF NOT EXISTS conversation_participants (
    id SERIAL PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT now(),
    left_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(conversation_id, user_id)
);

-- Update messages table structure
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'messages') THEN
        -- Add missing columns to existing messages table
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS content TEXT;
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url TEXT;
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name TEXT;
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_size BIGINT;
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES messages(id);
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
        
        -- Rename text to content if exists
        DO $rename$
        BEGIN
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'text') THEN
                ALTER TABLE messages RENAME COLUMN text TO content;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Column might not exist or already renamed
            NULL;
        END
        $rename$;
    ELSE
        CREATE TABLE messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
            sender_id UUID REFERENCES users(id),
            content TEXT,
            message_type TEXT DEFAULT 'text',
            file_url TEXT,
            file_name TEXT,
            file_size BIGINT,
            reply_to_message_id UUID REFERENCES messages(id),
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now(),
            is_deleted BOOLEAN DEFAULT FALSE,
            deleted_at TIMESTAMPTZ
        );
    END IF;
END
$$;

-- Message reads table
CREATE TABLE IF NOT EXISTS message_reads (
    id SERIAL PRIMARY KEY,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(message_id, user_id)
);

-- Update groups table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'groups') THEN
        ALTER TABLE groups ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
        ALTER TABLE groups ADD COLUMN IF NOT EXISTS max_members INT DEFAULT 256;
    END IF;
END
$$;

-- Update group_members table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'group_members') THEN
        ALTER TABLE group_members ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES users(id);
        ALTER TABLE group_members ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;
        ALTER TABLE group_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    END IF;
END
$$;

-- Group messages
CREATE TABLE IF NOT EXISTS group_messages (
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

-- Update channels table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'channels') THEN
        ALTER TABLE channels ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
        ALTER TABLE channels ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE;
    END IF;
END
$$;

-- Channel join requests
CREATE TABLE IF NOT EXISTS channel_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    requested_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES users(id),
    UNIQUE(channel_id, user_id)
);

-- Channel messages
CREATE TABLE IF NOT EXISTS channel_messages (
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

-- Notifications system
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ
);

-- Chat locks (rename from chat_lock if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chat_lock') THEN
        ALTER TABLE chat_lock RENAME TO chat_locks;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Table might not exist
    NULL;
END
$$;

CREATE TABLE IF NOT EXISTS chat_locks (
    id SERIAL PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMPTZ DEFAULT now(),
    unlocked_at TIMESTAMPTZ,
    UNIQUE(conversation_id, user_id)
);

-- Business features
CREATE TABLE IF NOT EXISTS user_analytics (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL,
    metric_value INT DEFAULT 1,
    metadata JSONB,
    recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lead_name TEXT NOT NULL,
    lead_email TEXT,
    lead_company TEXT,
    status TEXT DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INT DEFAULT 30,
    meeting_url TEXT,
    status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ================
-- FUNCTIONS AND TRIGGERS
-- ================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers if they don't exist
DO $$
BEGIN
    -- Users trigger
    IF NOT EXISTS (SELECT FROM information_schema.triggers WHERE trigger_name = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Conversations trigger
    IF NOT EXISTS (SELECT FROM information_schema.triggers WHERE trigger_name = 'update_conversations_updated_at') THEN
        CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Groups trigger
    IF NOT EXISTS (SELECT FROM information_schema.triggers WHERE trigger_name = 'update_groups_updated_at') THEN
        CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Channels trigger
    IF NOT EXISTS (SELECT FROM information_schema.triggers WHERE trigger_name = 'update_channels_updated_at') THEN
        CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Messages trigger
    IF NOT EXISTS (SELECT FROM information_schema.triggers WHERE trigger_name = 'update_messages_updated_at') THEN
        CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Follower counts function
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update counts
        UPDATE user_profiles 
        SET followers_count = (SELECT COUNT(*) FROM followers WHERE following_id = NEW.following_id)
        WHERE user_id = NEW.following_id;
        
        UPDATE user_profiles 
        SET following_count = (SELECT COUNT(*) FROM followers WHERE follower_id = NEW.follower_id)
        WHERE user_id = NEW.follower_id;
        
        -- Create notification
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
        UPDATE user_profiles 
        SET followers_count = (SELECT COUNT(*) FROM followers WHERE following_id = OLD.following_id)
        WHERE user_id = OLD.following_id;
        
        UPDATE user_profiles 
        SET following_count = (SELECT COUNT(*) FROM followers WHERE follower_id = OLD.follower_id)
        WHERE user_id = OLD.follower_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create follower trigger if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.triggers WHERE trigger_name = 'follower_counts_trigger') THEN
        CREATE TRIGGER follower_counts_trigger
            AFTER INSERT OR DELETE ON followers
            FOR EACH ROW EXECUTE FUNCTION update_follower_counts();
    END IF;
END
$$;

-- Auto-create user profile function
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create user profile trigger if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.triggers WHERE trigger_name = 'create_user_profile_trigger') THEN
        CREATE TRIGGER create_user_profile_trigger
            AFTER INSERT ON users
            FOR EACH ROW EXECUTE FUNCTION create_user_profile();
    END IF;
END
$$;

-- ================
-- CREATE INDEXES
-- ================

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON followers(following_id);
CREATE INDEX IF NOT EXISTS idx_followers_created_at ON followers(created_at);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON messages(is_deleted);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- ================
-- INSERT MISSING USER PROFILES
-- ================

-- Create user profiles for existing users
INSERT INTO user_profiles (user_id)
SELECT id FROM users 
WHERE id NOT IN (SELECT user_id FROM user_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- ================
-- DEMO USER
-- ================

-- Insert demo user if not exists
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

-- ================
-- COMPLETION MESSAGE
-- ================

DO $$
BEGIN
    RAISE NOTICE '✅ Schema update completed successfully!';
    RAISE NOTICE '📊 Tables updated and missing columns added';
    RAISE NOTICE '🔧 Triggers and functions created';
    RAISE NOTICE '📈 Indexes optimized for performance';
    RAISE NOTICE '🎯 Ready for BusinessConnect application';
END
$$;