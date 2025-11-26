# Registration Fix Setup Guide

## Problem
Users getting "Database error saving new user" when trying to create accounts.

## Solution
This fix includes:
1. **REGISTRATION_FIX.sql** - Database fixes
2. **registration-fix.js** - Improved registration logic
3. Updated main HTML file

## Setup Instructions

### Step 1: Apply SQL Fix
1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `REGISTRATION_FIX.sql`
4. Run the SQL script

### Step 2: Verify Files
Make sure these files are in the same directory:
- `businessconnect.html`
- `registration-fix.js`
- `REGISTRATION_FIX.sql`

### Step 3: Test Registration
1. Open `businessconnect.html` in your browser
2. Try creating a new account
3. Check browser console for any errors

## What the Fix Does

### SQL Changes:
- Creates permissive RLS policies for profile creation
- Adds missing columns to profiles table
- Creates robust trigger for automatic profile creation
- Grants proper permissions to anon/authenticated users

### JavaScript Changes:
- Uses separate RegistrationManager class
- Implements retry logic and fallbacks
- Better error handling and reporting
- Graceful degradation if database fails

## Troubleshooting

### If registration still fails:
1. Check browser console for specific errors
2. Verify Supabase connection in Network tab
3. Check if RLS policies are properly applied
4. Ensure all required columns exist in profiles table

### Common Issues:
- **RLS Policy Error**: Run the SQL fix again
- **Column Missing**: Check if profiles table has all required columns
- **Permission Denied**: Verify anon/authenticated roles have proper grants

## Testing
After applying the fix, test with:
- Valid email and password
- Duplicate email (should show proper error)
- Weak password (should show proper error)
- Network disconnected (should use local fallback)