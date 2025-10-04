// Debug Email Manager
class DebugEmailManager {
    constructor() {
        this.verificationCode = null;
        this.newEmail = null;
    }

    async requestEmailChange(newEmail) {
        console.log('🔍 Debug: Starting email change request');
        console.log('New email:', newEmail);
        console.log('Current user:', window.authManager.currentUser);
        
        // Generate code
        this.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        this.newEmail = newEmail;
        
        console.log('Generated code:', this.verificationCode);
        
        // Check EmailJS availability
        console.log('EmailJS available:', !!window.emailjs);
        console.log('Email service:', window.emailService);
        console.log('Email config:', window.EMAIL_CONFIG);
        
        if (!window.emailjs) {
            console.error('❌ EmailJS not loaded');
            this.showCodeDirectly();
            return;
        }
        
        try {
            console.log('📧 Attempting to send email...');
            
            const templateParams = {
                to_email: window.authManager.currentUser.email,
                verification_code: this.verificationCode,
                new_email: newEmail,
                user_name: window.authManager.currentUser.display_name || window.authManager.currentUser.full_name || 'User'
            };
            
            console.log('Template params:', templateParams);
            
            const response = await emailjs.send(
                'service_tvwdsjv',
                'template_uk3cpsh',
                templateParams
            );
            
            console.log('✅ Email sent successfully:', response);
            window.authManager.showNotification('Verification code sent to your email!', 'success');
            this.showVerificationModal(true);
            
        } catch (error) {
            console.error('❌ Email sending failed:', error);
            console.log('Showing code directly as fallback');
            this.showCodeDirectly();
        }
    }
    
    showCodeDirectly() {
        window.authManager.showNotification(`Verification code: ${this.verificationCode}`, 'success');
        this.showVerificationModal(false);
    }
    
    showVerificationModal(emailSent) {
        const modal = document.createElement('div');
        modal.className = 'overlay';
        modal.innerHTML = `
            <div class="settings-modal" style="max-width: 400px;">
                <div class="settings-header">
                    <h3>🔍 Debug: Email Verification</h3>
                    <button class="close-btn" onclick="this.closest('.overlay').remove()">×</button>
                </div>
                <div class="settings-content">
                    <div style="background: ${emailSent ? '#d1fae5' : '#fef3c7'}; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                        <p style="margin: 0; font-size: 14px;">
                            ${emailSent ? '✅ Email sent successfully!' : '⚠️ Email failed - showing code directly:'}
                        </p>
                        ${!emailSent ? `<p style="margin: 8px 0 0 0; font-family: monospace; font-size: 18px; font-weight: bold;">${this.verificationCode}</p>` : ''}
                    </div>
                    <div class="form-group">
                        <label>Enter 6-digit code:</label>
                        <input type="text" id="verificationCode" maxlength="6" 
                               style="text-align: center; font-size: 18px; letter-spacing: 2px;"
                               placeholder="000000">
                    </div>
                    <div style="display: flex; gap: 12px; margin-top: 20px;">
                        <button class="btn btn-primary" onclick="window.debugEmailManager.verifyCode()" style="flex: 1;">
                            Verify & Change Email
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
        
        if (enteredCode === this.verificationCode) {
            // Update email
            window.authManager.currentUser.email = this.newEmail;
            localStorage.setItem('businessconnect_current_user', JSON.stringify(window.authManager.currentUser));
            
            document.querySelector('.overlay').remove();
            window.authManager.showNotification('Email updated successfully!', 'success');
            
            if (window.professionalSettings) {
                window.professionalSettings.loadUserData();
            }
        } else {
            window.authManager.showNotification('Invalid verification code', 'error');
        }
    }
}

// Initialize debug email manager
window.debugEmailManager = new DebugEmailManager();