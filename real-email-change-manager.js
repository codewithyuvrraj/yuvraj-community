// Real Email Change Manager with Actual Email Sending
class RealEmailChangeManager {
    constructor() {
        this.verificationCode = null;
        this.newEmail = null;
        this.emailLogId = null;
        this.isVerifying = false;
    }

    async requestEmailChange(newEmail) {
        console.log('Real email change requested for:', newEmail);
        
        if (!this.validateEmail(newEmail)) {
            window.authManager.showNotification('Please enter a valid email address', 'error');
            return false;
        }

        if (newEmail === window.authManager.currentUser.email) {
            window.authManager.showNotification('New email must be different from current email', 'error');
            return false;
        }

        try {
            // Generate 6-digit code
            this.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            this.newEmail = newEmail;
            
            console.log('Generated verification code:', this.verificationCode);

            // Log email attempt in database
            if (window.isSupabaseEnabled) {
                const { data: logData, error: logError } = await supabase
                    .rpc('log_email_attempt', {
                        p_user_id: window.authManager.currentUser.id,
                        p_email_type: 'email_verification',
                        p_recipient_email: window.authManager.currentUser.email,
                        p_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
                    });

                if (!logError) {
                    this.emailLogId = logData;
                }
            }

            // Try to send real email
            let emailResult = await this.sendRealEmail();
            
            if (emailResult.success) {
                // Update log status to sent
                if (this.emailLogId && window.isSupabaseEnabled) {
                    await supabase.rpc('update_email_log_status', {
                        p_log_id: this.emailLogId,
                        p_status: 'sent'
                    });
                }
                
                // Store verification code in database
                await this.storeVerificationCode();
                this.showVerificationModal(true);
                window.authManager.showNotification('Verification code sent to your email!', 'success');
            } else {
                // Update log status to failed
                if (this.emailLogId && window.isSupabaseEnabled) {
                    await supabase.rpc('update_email_log_status', {
                        p_log_id: this.emailLogId,
                        p_status: 'failed',
                        p_error_message: emailResult.error
                    });
                }
                
                // Fallback: show code directly
                await this.storeVerificationCode();
                this.showVerificationModal(false);
                window.authManager.showNotification('Email service unavailable. Code shown below.', 'warning');
            }

            return true;
        } catch (error) {
            console.error('Error requesting email change:', error);
            window.authManager.showNotification('Failed to process email change request', 'error');
            return false;
        }
    }

    async sendRealEmail() {
        try {
            // Try EmailJS first
            if (window.emailService) {
                const result = await window.emailService.sendVerificationEmail(
                    window.authManager.currentUser.email,
                    this.verificationCode,
                    this.newEmail
                );
                
                if (result.success) {
                    return result;
                }
            }

            // Try Supabase Edge Function as fallback
            if (window.isSupabaseEnabled) {
                const result = await window.emailService.sendEmailViaSupabase(
                    window.authManager.currentUser.email,
                    this.verificationCode,
                    this.newEmail
                );
                
                if (result.success) {
                    return result;
                }
            }

            return { success: false, error: 'No email service available' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async storeVerificationCode() {
        if (window.isSupabaseEnabled) {
            try {
                await supabase
                    .from('email_verification_codes')
                    .insert({
                        user_id: window.authManager.currentUser.id,
                        verification_code: this.verificationCode,
                        new_email: this.newEmail,
                        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
                        email_log_id: this.emailLogId
                    });
                console.log('Verification code stored in database');
            } catch (error) {
                console.log('Failed to store verification code:', error);
            }
        }
    }

    showVerificationModal(emailSent = false) {
        const modal = document.createElement('div');
        modal.className = 'overlay';
        
        // Only show code if email wasn't sent
        const codeDisplay = !emailSent ? `
            <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>Email Service Unavailable:</strong> Your verification code is: 
                    <span style="font-family: monospace; font-size: 16px; font-weight: bold; background: white; padding: 2px 6px; border-radius: 4px;">${this.verificationCode}</span>
                </p>
            </div>
        ` : `
            <div style="background: #d1fae5; border: 1px solid #10b981; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                <p style="margin: 0; color: #065f46; font-size: 14px;">
                    <i class="fas fa-check-circle"></i> <strong>Email Sent Successfully!</strong> Check your inbox for the verification code.
                </p>
            </div>
        `;
        
        modal.innerHTML = `
            <div class="settings-modal" style="max-width: 400px;">
                <div class="settings-header">
                    <h3><i class="fas fa-envelope"></i> Verify Email Change</h3>
                    <button class="close-btn" onclick="this.closest('.overlay').remove()">×</button>
                </div>
                <div class="settings-content">
                    ${codeDisplay}
                    <p style="margin-bottom: 20px; color: #374151;">
                        ${emailSent ? 'We\'ve sent a 6-digit verification code to:' : 'Enter the verification code for:'}
                        <strong>${window.authManager.currentUser.email}</strong>
                    </p>
                    <div class="form-group">
                        <label>Enter 6-digit code:</label>
                        <input type="text" id="verificationCode" maxlength="6" 
                               style="text-align: center; font-size: 18px; letter-spacing: 2px;"
                               placeholder="000000">
                    </div>
                    <div style="display: flex; gap: 12px; margin-top: 20px;">
                        <button class="btn btn-primary" onclick="window.realEmailChangeManager.verifyCode()" style="flex: 1;">
                            <i class="fas fa-check"></i> Verify & Change Email
                        </button>
                        <button class="btn" onclick="this.closest('.overlay').remove()" style="flex: 1;">
                            Cancel
                        </button>
                    </div>
                    <p style="margin-top: 15px; font-size: 12px; color: #6b7280; text-align: center;">
                        Code expires in 10 minutes
                    </p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Focus on input
        setTimeout(() => {
            document.getElementById('verificationCode').focus();
        }, 100);
    }

    async verifyCode() {
        const enteredCode = document.getElementById('verificationCode').value.trim();
        console.log('Verifying code:', enteredCode, 'Expected:', this.verificationCode);
        
        if (!enteredCode || enteredCode.length !== 6) {
            window.authManager.showNotification('Please enter a 6-digit code', 'error');
            return;
        }

        if (enteredCode !== this.verificationCode) {
            window.authManager.showNotification('Invalid verification code', 'error');
            return;
        }

        try {
            console.log('Updating email from', window.authManager.currentUser.email, 'to', this.newEmail);
            
            // Update email in Supabase Auth and profiles
            if (window.isSupabaseEnabled) {
                const { error: authError } = await supabase.auth.updateUser({
                    email: this.newEmail
                });

                if (authError) {
                    console.error('Auth update error:', authError);
                    throw authError;
                }

                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ email: this.newEmail })
                    .eq('id', window.authManager.currentUser.id);

                if (profileError) {
                    console.error('Profile update error:', profileError);
                    throw profileError;
                }
            }

            // Update current user object
            window.authManager.currentUser.email = this.newEmail;
            localStorage.setItem('businessconnect_current_user', JSON.stringify(window.authManager.currentUser));
            
            // Clear verification data
            this.verificationCode = null;
            this.newEmail = null;
            this.emailLogId = null;

            // Close modal
            document.querySelector('.overlay').remove();
            
            window.authManager.showNotification('Email updated successfully!', 'success');
            
            // Refresh professional settings if open
            if (window.professionalSettings) {
                window.professionalSettings.loadUserData();
            }

        } catch (error) {
            console.error('Error updating email:', error);
            window.authManager.showNotification('Failed to update email: ' + error.message, 'error');
        }
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// Initialize real email change manager
window.realEmailChangeManager = new RealEmailChangeManager();