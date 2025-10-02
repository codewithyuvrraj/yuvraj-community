# BusinessConnect Setup Guide

## 🚀 Quick Setup Instructions

### Step 1: Database Setup
Run the SQL files in this **exact order** in your Supabase SQL Editor:

```sql
-- 1. First, run the error fixes to ensure clean setup
\i sql_error_fixes.sql

-- 2. Then run the basic setup
\i supabase_setup.sql

-- 3. Add follow system
\i follows_table.sql

-- 4. Add profile enhancements
\i profile_fields_update.sql

-- 5. Finally, enable global access
\i global_access_update.sql
```

### Step 2: Configuration
Update both HTML files with your Supabase credentials:

**businessconnect.html** and **search.html**:
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';
```

### Step 3: Storage Setup
1. Go to Supabase Dashboard → Storage
2. Create a bucket named `documents`
3. Make it public
4. Set up the storage policies (already included in SQL files)

### Step 4: Test the Application
1. Open `businessconnect.html` in your browser
2. Create a test account or use demo credentials:
   - Email: `demo@example.com`
   - Password: `demo123`

## 🔧 Troubleshooting Common Issues

### Issue 1: "Column does not exist" errors
**Solution**: Run `sql_error_fixes.sql` first - it adds missing columns and handles errors gracefully.

### Issue 2: Users not visible in search
**Solution**: Check that `global_access_update.sql` was executed successfully.

### Issue 3: RLS policy errors
**Solution**: The error fixes file includes safe policy creation with error handling.

### Issue 4: Profile photos not uploading
**Solution**: Ensure the `documents` storage bucket exists and is public.

## 📋 Database Schema Verification

After running all SQL files, verify your setup with this query:

```sql
-- Check table structures
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'follows', 'messages')
ORDER BY table_name, ordinal_position;
```

Expected tables:
- ✅ `profiles` - User profiles with business fields
- ✅ `follows` - Follow relationships
- ✅ `messages` - Chat messages
- ✅ `conversations` - Chat conversations

## 🎯 Features Verification Checklist

After setup, verify these features work:

### Authentication
- [ ] User registration
- [ ] User login
- [ ] Profile creation
- [ ] Demo account login

### User Discovery
- [ ] Search users by name
- [ ] Search users by job title
- [ ] Search users by company
- [ ] View user profiles

### Networking
- [ ] Follow users
- [ ] Unfollow users
- [ ] View followed users in home feed
- [ ] Profile photo upload

### Messaging
- [ ] Start conversations
- [ ] Send messages
- [ ] File sharing
- [ ] Real-time message delivery

### Business Tools
- [ ] Analytics dashboard
- [ ] Meeting scheduler
- [ ] Lead management
- [ ] Notifications

## 🔐 Security Features

The setup includes:
- ✅ Row Level Security (RLS) policies
- ✅ Input sanitization
- ✅ File upload validation
- ✅ Secure authentication
- ✅ Global user access with privacy controls

## 📱 Mobile Compatibility

The platform is fully responsive and works on:
- ✅ Desktop browsers
- ✅ Mobile browsers
- ✅ Tablets
- ✅ Touch devices

## 🚀 Performance Optimizations

Included optimizations:
- ✅ Database indexes for fast queries
- ✅ Efficient search functions
- ✅ Image optimization
- ✅ Local caching
- ✅ Real-time subscriptions

## 🆘 Getting Help

If you encounter issues:

1. **Check the browser console** for JavaScript errors
2. **Check Supabase logs** for database errors
3. **Verify SQL execution** - all files should run without errors
4. **Test with demo account** first
5. **Check network connectivity** to Supabase

## 🎉 Success Indicators

Your setup is successful when:
- ✅ No SQL errors during setup
- ✅ Demo login works
- ✅ Users appear in search
- ✅ Follow/unfollow works
- ✅ Messages send successfully
- ✅ Profile photos upload

## 📈 Next Steps

After successful setup:
1. Customize the branding and colors
2. Add your business logic
3. Configure email notifications
4. Set up analytics tracking
5. Deploy to production

---

**Need help?** Check the README.md for detailed documentation and troubleshooting tips.