// Email Service Manager for Real Email Sending
class EmailService {
    constructor() {
        this.apiKey = null;
        this.serviceProvider = 'emailjs'; // Default to EmailJS
    }

    // Initialize with EmailJS
    initEmailJS(publicKey, serviceId, templateId) {
        this.publicKey = publicKey;
        this.serviceId = serviceId;
        this.templateId = templateId;
        
        // Load EmailJS library
        if (!window.emailjs) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
            script.onload = () => {
                emailjs.init(this.publicKey);
                console.log('EmailJS initialized');
            };
            document.head.appendChild(script);
        }
    }

    // Send verification email using EmailJS
    async sendVerificationEmail(toEmail, verificationCode, newEmail) {
        try {
            if (!window.emailjs) {
                throw new Error('EmailJS not loaded');
            }

            const templateParams = {
                to_email: toEmail,
                verification_code: verificationCode,
                new_email: newEmail,
                user_name: window.authManager.currentUser.display_name || window.authManager.currentUser.full_name || 'User'
            };

            const response = await emailjs.send(
                this.serviceId,
                this.templateId,
                templateParams
            );

            console.log('Email sent successfully:', response);
            return { success: true, response };
        } catch (error) {
            console.error('Email sending failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Alternative: Send using Supabase Edge Function
    async sendEmailViaSupabase(toEmail, verificationCode, newEmail) {
        try {
            const { data, error } = await supabase.functions.invoke('send-email', {
                body: {
                    to: toEmail,
                    subject: 'Email Change Verification - BusinessConnect',
                    html: this.generateEmailTemplate(verificationCode, newEmail)
                }
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Supabase email failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Generate email template
    generateEmailTemplate(verificationCode, newEmail) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #3b82f6, #06b6d4); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
                    .code { background: #1e40af; color: white; font-size: 24px; font-weight: bold; padding: 15px; text-align: center; border-radius: 8px; letter-spacing: 3px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 Email Change Verification</h1>
                        <p>BusinessConnect - Professional Networking Platform</p>
                    </div>
                    <div class="content">
                        <h2>Verify Your Email Change Request</h2>
                        <p>You requested to change your email address to: <strong>${newEmail}</strong></p>
                        <p>Please use the following 6-digit verification code:</p>
                        <div class="code">${verificationCode}</div>
                        <p><strong>Important:</strong></p>
                        <ul>
                            <li>This code expires in 10 minutes</li>
                            <li>Do not share this code with anyone</li>
                            <li>If you didn't request this change, please ignore this email</li>
                        </ul>
                    </div>
                    <div class="footer">
                        <p>© 2025 BusinessConnect. All rights reserved.</p>
                        <p>This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
}

// Initialize email service
window.emailService = new EmailService();