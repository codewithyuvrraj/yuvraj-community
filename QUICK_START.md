# BusinessConnect - Quick Start Guide

## 🚀 Setup in 3 Steps

### Step 1: Database Setup
1. Go to [Supabase](https://supabase.com) and create a new project
2. Go to SQL Editor in your Supabase dashboard
3. Copy and paste the entire content of `FINAL_FIXED_SETUP.sql`
4. Click "Run" - you should see "BusinessConnect setup completed successfully!"

### Step 2: Configure Credentials
Update both HTML files with your Supabase credentials:

**In `businessconnect.html` and `search.html`:**
```javascript
// Replace these lines:
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';

// With your actual values:
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

**Find your credentials:**
- Go to Supabase Dashboard → Settings → API
- Copy "Project URL" and "anon public" key

### Step 3: Test the Application
1. Open `businessconnect.html` in your browser
2. Login with demo account:
   - **Email:** `demo@example.com`
   - **Password:** `demo123` (or create new account)
3. Click search button to find users
4. Follow users and start conversations

## ✅ Features Working

- ✅ User registration and login
- ✅ Professional profiles with business info
- ✅ User search and discovery
- ✅ Follow/unfollow system
- ✅ Real-time messaging
- ✅ File sharing
- ✅ Business tools (analytics, scheduler, leads)
- ✅ Mobile responsive design

## 🔧 Troubleshooting

**Issue:** "Failed to fetch" errors
**Solution:** Check your Supabase URL and API key are correct

**Issue:** Users not appearing in search
**Solution:** Make sure the SQL setup completed successfully

**Issue:** Can't send messages
**Solution:** Verify the storage bucket 'documents' exists in Supabase

## 📱 Usage Tips

- **Search Users:** Use the search button in the header
- **Follow Users:** Click follow button on user profiles
- **Start Chats:** Click message button or click on followed users
- **Business Tools:** Click briefcase icon in header
- **Settings:** Click hamburger menu for profile settings

## 🎯 Next Steps

1. Customize the branding and colors in CSS
2. Add your business logic and integrations
3. Deploy to a hosting service (Netlify, Vercel, etc.)
4. Set up custom domain and SSL

---

**Need help?** Check the full README.md for detailed documentation.

**Demo Account:** demo@example.com / demo123