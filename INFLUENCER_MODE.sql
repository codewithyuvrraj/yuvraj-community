-- Add influencer business mode to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_influencer_business BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS influencer_activated_at TIMESTAMPTZ;