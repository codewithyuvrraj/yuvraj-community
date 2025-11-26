// Simple Email Change Manager - No External Email Service Required
class SimpleEmailChangeManager {
    constructor() {
        this.verificationCode = null;
        this.newEmail = null;
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

        // Generate 6-digit code
        this.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        this.newEmail = newEmail;
        
        // Show verification modal with code
        this.showVerificationModal();
        return true;
    }

    showVerificationModal() {
        const modal = document.createElement('div');
        modal.className = 'overlay';
        modal.innerHTML = `
            <div class="settings-modal" style="max-width: 400px;">
                <div class="settings-header">
                    <h3><i class="fas fa-envelope"></i> Email Change Verification</h3>
                    <button class="close-btn" onclick="this.closest('.overlay').remove()">×</button>
                </div>
                <div class="settings-content">
                    <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                        <p style="margin: 0; color: #92400e; font-size: 14px;">
                            <strong>Your verification code:</strong> 
                            <span style="font-family: monospace; font-size: 18px; font-weight: bold; background: white; padding: 4px 8px; border-radius: 4px; margin-left: 8px;">${this.verificationCode}</span>
                        </p>
                    </div>
                    <p style="margin-bottom: 20px; color: #374151;">
                        Changing email from: <strong>${window.authManager.currentUser.email}</strong><br>
                        To: <strong>${this.newEmail}</strong>
                    </p>
                    <div class="form-group">
                        <label>Enter the 6-digit code above:</label>
                        <input type="text" id="verificationCode" maxlength="6" 
                               style="text-align: center; font-size: 18px; letter-spacing: 2px;"
                               placeholder="000000">
                    </div>
                    <div style="display: flex; gap: 12px; margin-top: 20px;">
                        <button class="btn btn-primary" onclick="window.simpleEmailChangeManager.verifyCode()" style="flex: 1;">
                            <i class="fas fa-check"></i> Verify & Change Email
                        </button>
                        <button class="btn" onclick="this.closest('.overlay').remove()" style="flex: 1;">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
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
            // Update email in Supabase if available
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

// Initialize simple email change manager
window.simpleEmailChangeManager = new SimpleEmailChangeManager();