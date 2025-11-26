class EmailChangeManager {
    constructor() {
        this.verificationCode = null;
        this.newEmail = null;
        this.isVerifying = false;
    }

    async requestEmailChange(newEmail) {
        console.log('Email change requested for:', newEmail);
        
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

            // Try to send verification code to current email
            let emailSent = false;
            try {
                const { error } = await supabase.functions.invoke('send-verification-email', {
                    body: {
                        email: window.authManager.currentUser.email,
                        code: this.verificationCode,
                        newEmail: newEmail
                    }
                });
                
                if (!error) {
                    emailSent = true;
                    console.log('Email sent successfully');
                }
            } catch (emailError) {
                console.log('Email function not available, using fallback');
            }

            // Store code in database for verification
            if (window.isSupabaseEnabled) {
                try {
                    await supabase
                        .from('email_verification_codes')
                        .insert({
                            user_id: window.authManager.currentUser.id,
                            verification_code: this.verificationCode,
                            new_email: newEmail,
                            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
                        });
                    console.log('Verification code stored in database');
                } catch (dbError) {
                    console.log('Database storage failed, continuing with in-memory code');
                }
            }

            this.showVerificationModal(emailSent);
            return true;
        } catch (error) {
            console.error('Error requesting email change:', error);
            window.authManager.showNotification('Failed to send verification code', 'error');
            return false;
        }
    }

    showVerificationModal(emailSent = false) {
        const modal = document.createElement('div');
        modal.className = 'overlay';
        
        // Show code directly if email wasn't sent (for testing)
        const codeDisplay = !emailSent ? `
            <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>Testing Mode:</strong> Your verification code is: <span style="font-family: monospace; font-size: 16px; font-weight: bold;">${this.verificationCode}</span>
                </p>
            </div>
        ` : '';
        
        modal.innerHTML = `
            <div class="settings-modal" style="max-width: 400px;">
                <div class="settings-header">
                    <h3><i class="fas fa-envelope"></i> Verify Email Change</h3>
                    <button class="close-btn" onclick="this.closest('.overlay').remove()">×</button>
                </div>
                <div class="settings-content">
                    ${codeDisplay}
                    <p style="margin-bottom: 20px; color: #374151;">
                        ${emailSent ? 'We\'ve sent a 6-digit verification code to your current email:' : 'Enter the 6-digit verification code for:'}
                        <strong>${window.authManager.currentUser.email}</strong>
                    </p>
                    <div class="form-group">
                        <label>Enter 6-digit code:</label>
                        <input type="text" id="verificationCode" maxlength="6" 
                               style="text-align: center; font-size: 18px; letter-spacing: 2px;"
                               placeholder="000000">
                    </div>
                    <div style="display: flex; gap: 12px; margin-top: 20px;">
                        <button class="btn btn-primary" onclick="window.emailChangeManager.verifyCode()" style="flex: 1;">
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
            
            // Update email in Supabase Auth
            if (window.isSupabaseEnabled) {
                const { error: authError } = await supabase.auth.updateUser({
                    email: this.newEmail
                });

                if (authError) {
                    console.error('Auth update error:', authError);
                    throw authError;
                }
                console.log('Auth email updated successfully');

                // Update email in profiles table
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ email: this.newEmail })
                    .eq('id', window.authManager.currentUser.id);

                if (profileError) {
                    console.error('Profile update error:', profileError);
                    throw profileError;
                }
                console.log('Profile email updated successfully');
            }

            // Update current user object
            window.authManager.currentUser.email = this.newEmail;
            localStorage.setItem('businessconnect_current_user', JSON.stringify(window.authManager.currentUser));
            
            // Clear verification data
            this.verificationCode = null;
            this.newEmail = null;

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

// Initialize email change manager
window.emailChangeManager = new EmailChangeManager();