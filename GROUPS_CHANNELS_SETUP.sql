-- Groups and Channels System
-- Run this SQL in your Supabase SQL Editor

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    group_photo TEXT,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- 'admin', 'member'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Create channels table
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    channel_photo TEXT,
    is_private BOOLEAN DEFAULT false,
    requires_approval BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create channel_members table
CREATE TABLE IF NOT EXISTS channel_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'subscriber', -- 'admin', 'subscriber'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(channel_id, user_id)
);

-- Create channel_join_requests table
CREATE TABLE IF NOT EXISTS channel_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES profiles(id),
    UNIQUE(channel_id, user_id)
);

-- Create group_messages table
CREATE TABLE IF NOT EXISTS group_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    text TEXT,
    type VARCHAR(20) DEFAULT 'text', -- 'text', 'file', 'image'
    file_url TEXT,
    file_name TEXT,
    file_size BIGINT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create channel_messages table
CREATE TABLE IF NOT EXISTS channel_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    text TEXT,
    type VARCHAR(20) DEFAULT 'text', -- 'text', 'file', 'image'
    file_url TEXT,
    file_name TEXT,
    file_size BIGINT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_groups_creator ON groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_creator ON channels(creator_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user ON channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_requests_channel ON channel_join_requests(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_requests_user ON channel_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_channel ON channel_messages(channel_id);

-- Enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all groups" ON groups FOR SELECT USING (true);
CREATE POLICY "Users can create groups" ON groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own groups" ON groups FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "Users can view group members" ON group_members FOR SELECT USING (true);
CREATE POLICY "Users can join groups" ON group_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can leave groups" ON group_members FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can view all channels" ON channels FOR SELECT USING (true);
CREATE POLICY "Users can create channels" ON channels FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own channels" ON channels FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "Users can view channel members" ON channel_members FOR SELECT USING (true);
CREATE POLICY "Users can join channels" ON channel_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can leave channels" ON channel_members FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can view channel requests" ON channel_join_requests FOR SELECT USING (true);
CREATE POLICY "Users can create join requests" ON channel_join_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update join requests" ON channel_join_requests FOR UPDATE USING (true);

CREATE POLICY "Users can view group messages" ON group_messages FOR SELECT USING (true);
CREATE POLICY "Users can send group messages" ON group_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view channel messages" ON channel_messages FOR SELECT USING (true);
CREATE POLICY "Channel admins can send messages" ON channel_messages FOR INSERT WITH CHECK (true);