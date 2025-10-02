-- FINAL BUSINESSCONNECT SETUP
-- Remove foreign key constraint if it exists
ALTER TABLE IF EXISTS profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    username TEXT UNIQUE,
    full_name TEXT,
    profile_photo TEXT,
    bio TEXT,
    job_title TEXT,
    company TEXT,
    industry TEXT DEFAULT 'Technology',
    business_hours TEXT DEFAULT '9 AM - 5 PM',
    timezone TEXT DEFAULT 'UTC+0 (GMT)',
    auto_reply TEXT DEFAULT 'Disabled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    conversation_id TEXT NOT NULL,
    text TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    file_url TEXT,
    file_name TEXT,
    file_size BIGINT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_policy ON profiles;
DROP POLICY IF EXISTS follows_policy ON follows;
DROP POLICY IF EXISTS messages_policy ON messages;

CREATE POLICY profiles_policy ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY follows_policy ON follows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY messages_policy ON messages FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true) ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS storage_policy ON storage.objects;
CREATE POLICY storage_policy ON storage.objects FOR ALL USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');

GRANT ALL ON profiles TO anon, authenticated;
GRANT ALL ON follows TO anon, authenticated;
GRANT ALL ON messages TO anon, authenticated;

INSERT INTO profiles (id, email, username, full_name, bio, job_title, company)
VALUES (
    gen_random_uuid(),
    'demo@example.com',
    'demo',
    'Demo User',
    'Professional demo account',
    'Business Manager',
    'BusinessConnect'
) ON CONFLICT (email) DO NOTHING;

-- Add search function
CREATE OR REPLACE FUNCTION search_users(search_term text)
RETURNS TABLE (
    id uuid,
    username text,
    full_name text,
    email text,
    profile_photo text,
    bio text,
    job_title text,
    company text,
    industry text,
    business_hours text,
    timezone text,
    updated_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, p.username, p.full_name, p.email, p.profile_photo,
        p.bio, p.job_title, p.company, p.industry, p.business_hours,
        p.timezone, p.updated_at
    FROM profiles p
    WHERE 
        p.username ILIKE '%' || search_term || '%' OR
        p.full_name ILIKE '%' || search_term || '%' OR
        p.bio ILIKE '%' || search_term || '%' OR
        p.job_title ILIKE '%' || search_term || '%' OR
        p.company ILIKE '%' || search_term || '%'
    ORDER BY p.updated_at DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION search_users(text) TO anon, authenticated;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

SELECT 'BusinessConnect setup completed successfully!' as result;