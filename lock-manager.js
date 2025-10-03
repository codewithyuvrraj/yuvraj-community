// Lock Manager for Messages, Groups, and Channels
class LockManager {
    constructor() {
        this.lockPassword = localStorage.getItem('lockPassword');
        this.isUnlocked = false;
    }

    // Show lock options dropdown
    showLockOptions() {
        const modal = document.createElement('div');
        modal.className = 'overlay';
        modal.innerHTML = `
            <div class="settings-modal" style="max-width: 300px;">
                <div class="settings-header" style="background: #f59e0b; color: white;">
                    <h3><i class="fas fa-lock"></i> Lock Options</h3>
                    <button class="close-btn" onclick="this.closest('.overlay').remove()" style="color: white;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="settings-content" style="padding: 16px;">
                    <button class="lock-option-btn" onclick="window.lockManager.lockMessages()" style="width: 100%; padding: 12px; margin-bottom: 8px; background: #f59e0b; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-comment"></i> Lock Messages
                    </button>
                    <button class="lock-option-btn" onclick="window.lockManager.lockGroups()" style="width: 100%; padding: 12px; margin-bottom: 8px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-users"></i> Lock Groups
                    </button>
                    <button class="lock-option-btn" onclick="window.lockManager.lockChannels()" style="width: 100%; padding: 12px; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-broadcast-tower"></i> Lock Channels
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Show unlock options dropdown
    showUnlockOptions() {
        const modal = document.createElement('div');
        modal.className = 'overlay';
        modal.innerHTML = `
            <div class="settings-modal" style="max-width: 300px;">
                <div class="settings-header" style="background: #10b981; color: white;">
                    <h3><i class="fas fa-unlock"></i> Unlock Options</h3>
                    <button class="close-btn" onclick="this.closest('.overlay').remove()" style="color: white;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="settings-content" style="padding: 16px;">
                    <button class="unlock-option-btn" onclick="window.lockManager.unlockMessages()" style="width: 100%; padding: 12px; margin-bottom: 8px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-comment"></i> Unlock Messages
                    </button>
                    <button class="unlock-option-btn" onclick="window.lockManager.unlockGroups()" style="width: 100%; padding: 12px; margin-bottom: 8px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-users"></i> Unlock Groups
                    </button>
                    <button class="unlock-option-btn" onclick="window.lockManager.unlockChannels()" style="width: 100%; padding: 12px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-broadcast-tower"></i> Unlock Channels
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Lock messages
    async lockMessages() {
        if (!this.lockPassword) {
            this.showSetPasswordModal('messages');
            return;
        }
        
        try {
            if (window.isSupabaseEnabled && window.authManager?.currentUser) {
                await window.supabase.rpc('lock_feature', {
                    p_user_id: window.authManager.currentUser.id,
                    p_feature_type: 'messages'
                });
            }
            
            localStorage.setItem('messagesLocked', 'true');
            document.querySelector('.overlay').remove();
            window.authManager.showNotification('Messages locked', 'success');
        } catch (error) {
            console.error('Error locking messages:', error);
            window.authManager.showNotification('Failed to lock messages', 'error');
        }
    }

    // Lock groups
    async lockGroups() {
        if (!this.lockPassword) {
            this.showSetPasswordModal('groups');
            return;
        }
        
        try {
            if (window.isSupabaseEnabled && window.authManager?.currentUser) {
                await window.supabase.rpc('lock_feature', {
                    p_user_id: window.authManager.currentUser.id,
                    p_feature_type: 'groups'
                });
            }
            
            localStorage.setItem('groupsLocked', 'true');
            document.querySelector('.overlay').remove();
            window.authManager.showNotification('Groups locked', 'success');
        } catch (error) {
            console.error('Error locking groups:', error);
            window.authManager.showNotification('Failed to lock groups', 'error');
        }
    }

    // Lock channels
    async lockChannels() {
        if (!this.lockPassword) {
            this.showSetPasswordModal('channels');
            return;
        }
        
        try {
            if (window.isSupabaseEnabled && window.authManager?.currentUser) {
                await window.supabase.rpc('lock_feature', {
                    p_user_id: window.authManager.currentUser.id,
                    p_feature_type: 'channels'
                });
            }
            
            localStorage.setItem('channelsLocked', 'true');
            document.querySelector('.overlay').remove();
            window.authManager.showNotification('Channels locked', 'success');
        } catch (error) {
            console.error('Error locking channels:', error);
            window.authManager.showNotification('Failed to lock channels', 'error');
        }
    }

    // Unlock messages
    async unlockMessages() {
        this.showUnlockModal('messages');
    }

    // Unlock groups
    async unlockGroups() {
        this.showUnlockModal('groups');
    }

    // Unlock channels
    async unlockChannels() {
        this.showUnlockModal('channels');
    }

    // Show password setup modal
    showSetPasswordModal(featureType) {
        const modal = document.createElement('div');
        modal.className = 'overlay';
        modal.innerHTML = `
            <div class="settings-modal" style="max-width: 350px;">
                <div class="settings-header" style="background: #f59e0b; color: white;">
                    <h3><i class="fas fa-key"></i> Set Lock Password</h3>
                </div>
                <div class="settings-content" style="padding: 20px; text-align: center;">
                    <p style="margin-bottom: 16px;">Set a password to lock ${featureType}</p>
                    <input type="password" id="lockPassword" placeholder="Enter password" style="width: 100%; padding: 8px; margin-bottom: 12px; border: 1px solid #e5e7eb; border-radius: 6px;">
                    <input type="password" id="confirmPassword" placeholder="Confirm password" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #e5e7eb; border-radius: 6px;">
                    <div style="display: flex; gap: 8px;">
                        <button onclick="this.closest('.overlay').remove()" style="flex: 1; padding: 8px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">Cancel</button>
                        <button onclick="window.lockManager.confirmSetPassword('${featureType}')" style="flex: 1; padding: 8px; background: #f59e0b; color: white; border: none; border-radius: 6px; cursor: pointer;">Set</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Show unlock modal
    showUnlockModal(featureType) {
        const modal = document.createElement('div');
        modal.className = 'overlay';
        modal.innerHTML = `
            <div class="settings-modal" style="max-width: 350px;">
                <div class="settings-header" style="background: #10b981; color: white;">
                    <h3><i class="fas fa-unlock"></i> Unlock ${featureType}</h3>
                </div>
                <div class="settings-content" style="padding: 20px; text-align: center;">
                    <p style="margin-bottom: 16px;">Enter password to unlock ${featureType}</p>
                    <input type="password" id="unlockPassword" placeholder="Enter password" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #e5e7eb; border-radius: 6px;">
                    <div style="display: flex; gap: 8px;">
                        <button onclick="this.closest('.overlay').remove()" style="flex: 1; padding: 8px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">Cancel</button>
                        <button onclick="window.lockManager.confirmUnlock('${featureType}')" style="flex: 1; padding: 8px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">Unlock</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Confirm password setup
    confirmSetPassword(featureType) {
        const password = document.getElementById('lockPassword').value;
        const confirm = document.getElementById('confirmPassword').value;
        
        if (!password || password.length < 4) {
            alert('Password must be at least 4 characters');
            return;
        }
        
        if (password !== confirm) {
            alert('Passwords do not match');
            return;
        }
        
        this.lockPassword = password;
        localStorage.setItem('lockPassword', password);
        document.querySelector('.overlay').remove();
        
        // Lock the feature
        if (featureType === 'messages') this.lockMessages();
        else if (featureType === 'groups') this.lockGroups();
        else if (featureType === 'channels') this.lockChannels();
    }

    // Confirm unlock
    async confirmUnlock(featureType) {
        const password = document.getElementById('unlockPassword').value;
        
        if (password !== this.lockPassword) {
            alert('Incorrect password');
            return;
        }
        
        try {
            if (window.isSupabaseEnabled && window.authManager?.currentUser) {
                await window.supabase.rpc('unlock_feature', {
                    p_user_id: window.authManager.currentUser.id,
                    p_feature_type: featureType
                });
            }
            
            localStorage.removeItem(featureType + 'Locked');
            document.querySelector('.overlay').remove();
            window.authManager.showNotification(`${featureType} unlocked`, 'success');
        } catch (error) {
            console.error(`Error unlocking ${featureType}:`, error);
            window.authManager.showNotification(`Failed to unlock ${featureType}`, 'error');
        }
    }

    // Check if feature is locked
    isFeatureLocked(featureType) {
        return localStorage.getItem(featureType + 'Locked') === 'true';
    }
}

// Initialize lock manager
window.lockManager = new LockManager();