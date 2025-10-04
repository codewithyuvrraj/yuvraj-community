// Professional Settings Manager
class ProfessionalSettingsManager {
    constructor() {
        this.currentUser = null;
    }

    init(user) {
        this.currentUser = user;
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
                            <div style="width: 100%; padding: 12px; background: #f3f4f6; border-radius: 8px; color: #6b7280; font-family: monospace;">
                                ${this.currentUser.email}
                            </div>
                            <small style="color: #6b7280; margin-top: 4px;">This is your account email (cannot be changed here)</small>
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
window.professionalSettings = new ProfessionalSettingsManager();