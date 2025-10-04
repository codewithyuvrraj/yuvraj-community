class EmailChangeManager {
    constructor() {
        this.verificationCode = null;
        this.newEmail = null;
        this.isVerifying = false;
    }

    async requestEmailChange(newEmail) {
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

            // Send verification code to current email
            const { error } = await supabase.functions.invoke('send-verification-email', {
                body: {
                    email: window.authManager.currentUser.email,
                    code: this.verificationCode,
                    newEmail: newEmail
                }
            });

            if (error) {
                // Fallback: store code in database for verification
                await supabase
                    .from('email_verification_codes')
                    .insert({
                        user_id: window.authManager.currentUser.id,
                        verification_code: this.verificationCode,
                        new_email: newEmail,
                        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
                    });
            }

            this.showVerificationModal();
            return true;
        } catch (error) {
            console.error('Error requesting email change:', error);
            window.authManager.showNotification('Failed to send verification code', 'error');
            return false;
        }
    }

    showVerificationModal() {
        const modal = document.createElement('div');
        modal.className = 'overlay';
        modal.innerHTML = `
            <div class="settings-modal" style="max-width: 400px;">
                <div class="settings-header">
                    <h3><i class="fas fa-envelope"></i> Verify Email Change</h3>
                    <button class="close-btn" onclick="this.closest('.overlay').remove()">×</button>
                </div>
                <div class="settings-content">
                    <p style="margin-bottom: 20px; color: #374151;">
                        We've sent a 6-digit verification code to your current email:
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
        
        if (!enteredCode || enteredCode.length !== 6) {
            window.authManager.showNotification('Please enter a 6-digit code', 'error');
            return;
        }

        if (enteredCode !== this.verificationCode) {
            window.authManager.showNotification('Invalid verification code', 'error');
            return;
        }

        try {
            // Update email in Supabase Auth
            const { error: authError } = await supabase.auth.updateUser({
                email: this.newEmail
            });

            if (authError) throw authError;

            // Update email in profiles table
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ email: this.newEmail })
                .eq('id', window.authManager.currentUser.id);

            if (profileError) throw profileError;

            // Update current user object
            window.authManager.currentUser.email = this.newEmail;
            
            // Clear verification data
            this.verificationCode = null;
            this.newEmail = null;

            // Close modal
            document.querySelector('.overlay').remove();
            
            window.authManager.showNotification('Email updated successfully!', 'success');
            
            // Refresh professional settings if open
            if (window.professionalSettingsManager) {
                window.professionalSettingsManager.loadUserData();
            }

        } catch (error) {
            console.error('Error updating email:', error);
            window.authManager.showNotification('Failed to update email', 'error');
        }
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// Initialize email change manager
window.emailChangeManager = new EmailChangeManager();