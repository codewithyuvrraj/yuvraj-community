// Email Service Configuration
// Configure your email service provider here

// EmailJS Configuration
// 1. Sign up at https://www.emailjs.com/
// 2. Create a service (Gmail, Outlook, etc.)
// 3. Create an email template
// 4. Get your Public Key, Service ID, and Template ID
// 5. Update the values below

const EMAIL_CONFIG = {
    // EmailJS Configuration
    emailjs: {
        publicKey: '13eiwqw5g1bnVdLu-',          // Your EmailJS public key
        serviceId: 'service_tvwdsjv',             // Your service ID
        templateId: 'template_uk3cpsh',           // Your template ID
        enabled: true                             // Enabled with real credentials
    },
    
    // Supabase Edge Function Configuration (Alternative)
    supabase: {
        functionName: 'send-email',
        enabled: false                            // Set to true if you have edge function
    }
};

// EmailJS Template Variables (for reference)
// Use these variable names in your EmailJS template:
// {{to_email}} - Recipient email address
// {{verification_code}} - 6-digit verification code
// {{new_email}} - New email address user wants to change to
// {{user_name}} - User's display name

// Sample EmailJS Template:
/*
Subject: Email Change Verification - BusinessConnect

Hello {{user_name}},

You requested to change your email address to: {{new_email}}

Please use this verification code: {{verification_code}}

This code expires in 10 minutes.

If you didn't request this change, please ignore this email.

Best regards,
BusinessConnect Team
*/

// Initialize email service when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (EMAIL_CONFIG.emailjs.enabled && window.emailService) {
        window.emailService.initEmailJS(
            EMAIL_CONFIG.emailjs.publicKey,
            EMAIL_CONFIG.emailjs.serviceId,
            EMAIL_CONFIG.emailjs.templateId
        );
        console.log('Email service initialized with EmailJS');
    } else {
        console.log('Email service not configured. Using fallback mode.');
    }
});

// Export configuration
window.EMAIL_CONFIG = EMAIL_CONFIG;