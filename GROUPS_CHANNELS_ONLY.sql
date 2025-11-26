-- ============================================
-- COMPLETE GROUPS AND CHANNELS SETUP
-- ============================================
-- Run this SQL in your Nhost database to create
-- both groups and channels functionality

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    photo_url TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT now(),
    is_private BOOLEAN DEFAULT false
);

-- Group members
CREATE TABLE IF NOT EXISTS group_members (
    id SERIAL PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID,
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT now(),
    added_by UUID,
    UNIQUE(group_id, user_id)
);

-- Group messages
CREATE TABLE IF NOT EXISTS group_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    sender_id UUID,
    text TEXT,
    message_type TEXT DEFAULT 'text',
    file_url TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- Channels table  
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    photo_url TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT now(),
    is_private BOOLEAN DEFAULT false,
    requires_approval BOOLEAN DEFAULT true
);

-- Channel members
CREATE TABLE IF NOT EXISTS channel_members (
    id SERIAL PRIMARY KEY,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID,
    role TEXT DEFAULT 'subscriber',
    joined_at TIMESTAMP DEFAULT now(),
    added_by UUID,
    UNIQUE(channel_id, user_id)
);

-- Channel messages
CREATE TABLE IF NOT EXISTS channel_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    sender_id UUID,
    text TEXT,
    message_type TEXT DEFAULT 'text',
    file_url TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- Channel join requests
CREATE TABLE IF NOT EXISTS channel_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID,
    status TEXT DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT now(),
    reviewed_at TIMESTAMP,
    reviewed_by UUID,
    UNIQUE(channel_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);

CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id ON channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user_id ON channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_channel_id ON channel_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_requests_channel_id ON channel_join_requests(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_requests_user_id ON channel_join_requests(user_id);