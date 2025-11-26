-- Profile Views Tracking System
-- Run this SQL in your Supabase SQL Editor

-- Create profile_views table
CREATE TABLE IF NOT EXISTS profile_views (
    id BIGSERIAL PRIMARY KEY,
    viewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    viewed_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_profile ON profile_views(viewed_profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer ON profile_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_date ON profile_views(viewed_at);

-- Enable RLS
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all profile views" ON profile_views FOR SELECT USING (true);
CREATE POLICY "Users can insert profile views" ON profile_views FOR INSERT WITH CHECK (true);

-- Function to get profile view stats
CREATE OR REPLACE FUNCTION get_profile_view_stats(user_id UUID)
RETURNS JSON AS $$
DECLARE
    total_views INTEGER;
    today_views INTEGER;
    week_views INTEGER;
BEGIN
    -- Get total views
    SELECT COUNT(*) INTO total_views
    FROM profile_views 
    WHERE viewed_profile_id = user_id;
    
    -- Get today's views
    SELECT COUNT(*) INTO today_views
    FROM profile_views 
    WHERE viewed_profile_id = user_id 
    AND viewed_at >= CURRENT_DATE;
    
    -- Get this week's views
    SELECT COUNT(*) INTO week_views
    FROM profile_views 
    WHERE viewed_profile_id = user_id 
    AND viewed_at >= DATE_TRUNC('week', CURRENT_DATE);
    
    RETURN JSON_BUILD_OBJECT(
        'total_views', total_views,
        'today_views', today_views,
        'week_views', week_views
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;