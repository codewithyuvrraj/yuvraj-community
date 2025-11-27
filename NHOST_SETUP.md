# Nhost Setup Guide for BusinessConnect

## 🚀 Quick Setup

### 1. Apply Database Schema

1. Go to your Nhost project dashboard
2. Navigate to **Database** → **SQL Editor**
3. Copy and paste the contents of `nhost_complete_schema.sql`
4. Click **Run** to execute the schema

### 2. Configure Hasura Permissions

Go to **Hasura Console** and set up these permissions:

#### Users Table
- **Select**: `{"is_active": {"_eq": true}}` (all users can see active users)
- **Insert**: `{"id": {"_eq": "X-Hasura-User-Id"}}` (users can only insert their own profile)
- **Update**: `{"id": {"_eq": "X-Hasura-User-Id"}}` (users can only update their own profile)
- **Delete**: `{"id": {"_eq": "X-Hasura-User-Id"}}` (users can only delete their own profile)

#### Messages Table
- **Select**: `{"conversation": {"conversation_participants": {"user_id": {"_eq": "X-Hasura-User-Id"}}}}`
- **Insert**: `{"sender_id": {"_eq": "X-Hasura-User-Id"}}`
- **Update**: `{"sender_id": {"_eq": "X-Hasura-User-Id"}}`
- **Delete**: `{"sender_id": {"_eq": "X-Hasura-User-Id"}}`

#### Groups Table
- **Select**: `{}` (all users can see groups)
- **Insert**: `{"created_by": {"_eq": "X-Hasura-User-Id"}}`
- **Update**: `{"created_by": {"_eq": "X-Hasura-User-Id"}}`
- **Delete**: `{"created_by": {"_eq": "X-Hasura-User-Id"}}`

#### Group Members Table
- **Select**: `{"group": {"group_members": {"user_id": {"_eq": "X-Hasura-User-Id"}}}}`
- **Insert**: `{"user_id": {"_eq": "X-Hasura-User-Id"}}` OR `{"group": {"created_by": {"_eq": "X-Hasura-User-Id"}}}`
- **Delete**: `{"user_id": {"_eq": "X-Hasura-User-Id"}}` OR `{"group": {"created_by": {"_eq": "X-Hasura-User-Id"}}}`

### 3. Update Configuration

In `index.html`, update these values:
```javascript
const NHOST_SUBDOMAIN = 'your-subdomain-here';
const NHOST_REGION = 'your-region-here';
```

### 4. Test Connection

1. Open the application in browser
2. Open browser console (F12)
3. Run: `testNhostConnection()`
4. Run: `runAllTests()` for comprehensive testing

## 🔧 Troubleshooting

### Common Issues

#### 1. "NhostClient is not defined"
- **Cause**: Nhost SDK not loading
- **Fix**: Check internet connection, try different CDN URL

#### 2. "GraphQL Error: permission denied"
- **Cause**: Hasura permissions not set up
- **Fix**: Configure permissions in Hasura Console

#### 3. "Users not saving"
- **Cause**: Missing user profile creation
- **Fix**: Ensure `create_user_profile_trigger` is created

#### 4. "Groups not visible"
- **Cause**: Missing group member relationships
- **Fix**: Check group_members table permissions

### Debug Commands

```javascript
// Test basic connection
testNhostConnection()

// Test user creation
testUserCreation()

// Test group functionality
testGroupCreation()

// Run all tests
runAllTests()

// Check current user
window.nhost.auth.getUser()

// Check Nhost status
window.checkNhostStatus()
```

## 📊 Database Structure

### Core Tables
- `users` - User profiles and authentication
- `user_profiles` - Extended user data and stats
- `followers` - Follow relationships
- `conversations` - Chat conversations
- `messages` - Chat messages
- `groups` - Group chat groups
- `group_members` - Group membership
- `channels` - Broadcast channels
- `notifications` - User notifications

### Business Features
- `business_leads` - Lead management
- `meetings` - Meeting scheduler
- `user_analytics` - Usage analytics
- `chat_locks` - Chat locking system

## 🎯 Features Enabled

✅ User registration and authentication  
✅ Real-time messaging  
✅ Group chat functionality  
✅ Channel broadcasting  
✅ Follow system  
✅ Notifications  
✅ Business tools (leads, meetings, analytics)  
✅ Chat locking  
✅ File sharing  
✅ Profile management  

## 🔐 Security Features

- Row-level security with Hasura
- User isolation for messages and groups
- Secure file uploads via Nhost Storage
- Input validation and sanitization
- Rate limiting (configured in Nhost)

## 📱 Next Steps

1. Apply the schema
2. Configure permissions
3. Test functionality
4. Customize business features
5. Deploy to production

## 🆘 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify Nhost project settings
3. Test with the provided debug functions
4. Check Hasura GraphQL API explorer

---

**BusinessConnect** - Professional networking made simple! 🚀