// Professional Settings Manager
class ProfessionalSettingsManager {
    constructor() {
        this.currentUser = null;
    }

    init(user) {
        this.currentUser = user;
        console.log('Professional Settings initialized with user:', user);
    }
    
    loadUserData() {
        // Refresh user data from authManager
        if (window.authManager && window.authManager.currentUser) {
            this.currentUser = window.authManager.currentUser;
        }
    }

    showProfessionalSettings() {
        const modal = document.createElement('div');
        modal.className = 'overlay';
        modal.innerHTML = `
            <div class="settings-modal" style="max-width: 450px; max-height: 90vh;">
                <div class="settings-header" style="background: #3b82f6; color: white;">
                    <h3><i class="fas fa-user-tie"></i> Professional Settings</h3>
                    <button class="close-btn" onclick="this.closest('.overlay').remove()" style="color: white;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="settings-content" style="max-height: 70vh; overflow-y: auto;">
                    <div class="settings-section" style="background: #f8fafc; border-left: 4px solid #3b82f6;">
                        <h4><i class="fas fa-id-card"></i> Display Information</h4>
                        
                        <div class="setting-item" style="flex-direction: column; align-items: flex-start; margin-bottom: 20px;">
                            <label style="margin-bottom: 8px; font-weight: 600;">Display Name</label>
                            <input type="text" id="displayName" class="setting-input" style="width: 100%; max-width: none;" 
                                   value="${this.currentUser.display_name || this.currentUser.full_name || ''}" 
                                   placeholder="How others will see your name">
                            <small style="color: #6b7280; margin-top: 4px;">This is how your name appears to other users</small>
                        </div>

                        <div class="setting-item" style="flex-direction: column; align-items: flex-start; margin-bottom: 20px;">
                            <label style="margin-bottom: 8px; font-weight: 600;">Registered Email</label>
                            <div style="display: flex; gap: 10px; align-items: center; width: 100%;">
                                <div style="flex: 1; padding: 12px; background: #f3f4f6; border-radius: 8px; color: #6b7280; font-family: monospace;">
                                    ${this.currentUser.email || 'No email set'}
                                </div>
                                <button class="btn" onclick="console.log('Change button clicked'); if(window.professionalSettings) { window.professionalSettings.showChangeEmailModal(); } else { console.error('Professional settings not available'); alert('Professional settings not available'); }" 
                                        style="background: #3b82f6; color: white; padding: 8px 12px; font-size: 12px; white-space: nowrap;">
                                    <i class="fas fa-edit"></i> Change
                                </button>
                            </div>
                            <small style="color: #6b7280; margin-top: 4px;">Click Change to update your email address</small>
                            <div style="margin-top: 8px;">
                                <button class="btn" onclick="console.log('Test button clicked'); console.log('Email change manager:', window.emailChangeManager);" 
                                        style="background: #f59e0b; color: white; padding: 4px 8px; font-size: 10px;">
                                    Test Email Manager
                                </button>
                            </div>
                        </div>

                        <div class="setting-item" style="justify-content: center; margin-top: 24px;">
                            <button class="btn btn-primary" onclick="window.professionalSettings.saveDisplayName()" style="width: 100%;">
                                <i class="fas fa-save"></i> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    showChangeEmailModal() {
        console.log('showChangeEmailModal called');
        
        if (!this.currentUser || !this.currentUser.email) {
            console.error('No current user or email found');
            if (window.authManager) {
                window.authManager.showNotification('User information not available', 'error');
            }
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'overlay';
        modal.innerHTML = `
            <div class="settings-modal" style="max-width: 400px;">
                <div class="settings-header">
                    <h3><i class="fas fa-envelope"></i> Change Email</h3>
                    <button class="close-btn" onclick="this.closest('.overlay').remove()">×</button>
                </div>
                <div class="settings-content">
                    <p style="margin-bottom: 20px; color: #374151;">
                        Current email: <strong>${this.currentUser.email}</strong>
                    </p>
                    <div class="form-group">
                        <label>New Email Address:</label>
                        <input type="email" id="newEmail" placeholder="Enter new email address">
                    </div>
                    <div style="display: flex; gap: 12px; margin-top: 20px;">
                        <button class="btn btn-primary" onclick="window.professionalSettings.initiateEmailChange()" style="flex: 1;">
                            <i class="fas fa-paper-plane"></i> Send Verification Code
                        </button>
                        <button class="btn" onclick="this.closest('.overlay').remove()" style="flex: 1;">
                            Cancel
                        </button>
                    </div>
                    <p style="margin-top: 15px; font-size: 12px; color: #6b7280;">
                        A 6-digit verification code will be sent to your current email address.
                    </p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        setTimeout(() => {
            const emailInput = document.getElementById('newEmail');
            if (emailInput) {
                emailInput.focus();
            }
        }, 100);
    }

    async initiateEmailChange() {
        console.log('initiateEmailChange called');
        
        const newEmailInput = document.getElementById('newEmail');
        if (!newEmailInput) {
            console.error('New email input not found');
            return;
        }
        
        const newEmail = newEmailInput.value.trim();
        
        if (!newEmail) {
            if (window.authManager) {
                window.authManager.showNotification('Please enter a new email address', 'error');
            }
            return;
        }

        // Close current modal
        const overlay = document.querySelector('.overlay');
        if (overlay) {
            overlay.remove();
        }
        
        // Use simple email change manager
        if (window.simpleEmailChangeManager) {
            await window.simpleEmailChangeManager.requestEmailChange(newEmail);
        } else {
            console.error('Simple email change manager not found');
            if (window.authManager) {
                window.authManager.showNotification('Email change system not available', 'error');
            }
        }
    }

    async saveDisplayName() {
        const displayNameInput = document.getElementById('displayName');
        const newDisplayName = displayNameInput.value.trim();

        if (!newDisplayName) {
            window.authManager.showNotification('Display name cannot be empty', 'error');
            return;
        }

        try {
            if (window.isSupabaseEnabled) {
                const { error } = await window.supabase
                    .from('profiles')
                    .update({ display_name: newDisplayName })
                    .eq('id', this.currentUser.id);

                if (error) throw error;
            }

            // Update local user object
            this.currentUser.display_name = newDisplayName;
            window.authManager.currentUser.display_name = newDisplayName;
            localStorage.setItem('businessconnect_current_user', JSON.stringify(this.currentUser));

            window.authManager.showNotification('Display name updated successfully!', 'success');
            
            // Close modal
            document.querySelector('.overlay').remove();
            
            // Refresh home feed to show updated name
            window.authManager.loadHomeFeed();

        } catch (error) {
            console.error('Error updating display name:', error);
            window.authManager.showNotification('Failed to update display name', 'error');
        }
    }
}

// Initialize global instance
if (typeof window !== 'undefined') {
    window.professionalSettings = new ProfessionalSettingsManager();
    
    // Debug: Ensure the manager is available
    console.log('Professional Settings Manager initialized:', window.professionalSettings);
    
    // Ensure it's available after DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM loaded, Professional Settings Manager available:', window.professionalSettings);
        });
    }
} else {
    console.error('Window object not available for Professional Settings Manager');
}