# Email Service Setup Instructions

## Overview
This setup enables real email sending for email verification codes instead of showing them on screen.

## Files Created
- `email-service.js` - Email service manager
- `real-email-change-manager.js` - Updated email change manager with real email sending
- `email-config.js` - Configuration file for email services
- `setup_email_service.sql` - Database setup for email logging
- `EMAIL_SETUP_INSTRUCTIONS.md` - This file

## Setup Steps

### 1. Database Setup
Run the SQL file to set up email logging:
```sql
\i setup_email_service.sql
```

### 2. EmailJS Setup (Recommended)

#### Step 1: Create EmailJS Account
1. Go to https://www.emailjs.com/
2. Sign up for a free account
3. Verify your email address

#### Step 2: Add Email Service
1. Go to "Email Services" in your dashboard
2. Click "Add New Service"
3. Choose your email provider (Gmail, Outlook, etc.)
4. Follow the setup instructions
5. Note your **Service ID**

#### Step 3: Create Email Template
1. Go to "Email Templates"
2. Click "Create New Template"
3. Use this template:

```
Subject: Email Change Verification - BusinessConnect

Hello {{user_name}},

You requested to change your email address to: {{new_email}}

Please use this verification code: {{verification_code}}

This code expires in 10 minutes.

If you didn't request this change, please ignore this email.

Best regards,
BusinessConnect Team
```

4. Note your **Template ID**

#### Step 4: Get Public Key
1. Go to "Account" → "General"
2. Copy your **Public Key**

#### Step 5: Update Configuration
Edit `email-config.js` and update:
```javascript
const EMAIL_CONFIG = {
    emailjs: {
        publicKey: 'your_actual_public_key',
        serviceId: 'your_actual_service_id', 
        templateId: 'your_actual_template_id',
        enabled: true  // Change to true
    }
};
```

### 3. Include Files in HTML

Add these script tags to your HTML files (businessconnect.html and search.html):

```html
<!-- Add before closing </body> tag -->
<script src="email-service.js"></script>
<script src="real-email-change-manager.js"></script>
<script src="email-config.js"></script>
```

### 4. Test the System

1. Open your application
2. Go to Professional Settings
3. Click "Change" next to email
4. Enter a new email address
5. Click "Send Verification Code"
6. Check your email for the verification code
7. Enter the code to complete the change

## Alternative: Supabase Edge Function

If you prefer using Supabase Edge Functions:

### 1. Create Edge Function
```bash
supabase functions new send-email
```

### 2. Implement Email Sending
Use a service like SendGrid, Mailgun, or Resend in your edge function.

### 3. Update Configuration
```javascript
const EMAIL_CONFIG = {
    supabase: {
        functionName: 'send-email',
        enabled: true
    }
};
```

## Troubleshooting

### Email Not Sending
1. Check browser console for errors
2. Verify EmailJS configuration
3. Check EmailJS dashboard for failed sends
4. Ensure email service is properly connected

### Code Not Received
1. Check spam/junk folder
2. Verify email address is correct
3. Check EmailJS quota limits
4. Try with different email provider

### Configuration Issues
1. Double-check Public Key, Service ID, and Template ID
2. Ensure `enabled: true` in config
3. Verify template variables match exactly

## Fallback Mode
If email sending fails, the system will:
1. Show the verification code on screen
2. Log the failure in the database
3. Allow manual code entry
4. Display appropriate user messages

## Security Notes
- Never commit real API keys to version control
- Use environment variables for production
- Implement rate limiting for email sending
- Monitor email logs for abuse

## Support
- EmailJS Documentation: https://www.emailjs.com/docs/
- Supabase Edge Functions: https://supabase.com/docs/guides/functions