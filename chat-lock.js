// Chat Lock Manager for BusinessConnect
class ChatLockManager {
    constructor() {
        this.lockedChats = new Set();
        this.lockPassword = null;
        this.isUnlocked = false;
        this.loadLockedChats();
        
        // Load from database when user is available
        if (window.authManager?.currentUser) {
            this.loadLockedChats();
        } else {
            // Wait for user to be available
            setTimeout(() => {
                if (window.authManager?.currentUser) {
                    this.loadLockedChats();
                }
            }, 1000);
        }
    }

    // Load locked chats from localStorage and database
    async loadLockedChats() {
        const stored = localStorage.getItem('lockedChats');
        if (stored) {
            this.lockedChats = new Set(JSON.parse(stored));
        }
        this.lockPassword = localStorage.getItem('chatLockPassword');
        
        // Load from database if available
        if (window.isSupabaseEnabled && window.authManager?.currentUser) {
            try {
                const { data } = await window.supabase.rpc('get_locked_conversations_for_user', {
                    p_user_id: window.authManager.currentUser.id
                });
                
                if (data) {
                    data.forEach(item => {
                        this.lockedChats.add(item.conversation_id);
                    });
                    this.saveLockedChats();
                }
            } catch (error) {
                console.error('Error loading locked chats from database:', error);
            }
        }
    }

    // Save locked chats to localStorage
    saveLockedChats() {
        localStorage.setItem('lockedChats', JSON.stringify([...this.lockedChats]));
    }

    // Set lock password
    setLockPassword(password) {
        this.lockPassword = password;
        localStorage.setItem('chatLockPassword', password);
    }

    // Verify password
    verifyPassword(password) {
        return this.lockPassword === password;
    }

    // Lock a chat
    async lockChat(conversationId) {
        if (!this.lockPassword) {
            this.showSetPasswordModal();
            return false;
        }
        
        try {
            if (window.isSupabaseEnabled && window.authManager?.currentUser) {
                await window.supabase.rpc('lock_conversation', {
                    p_user_id: window.authManager.currentUser.id,
                    p_conversation_id: conversationId
                });
            }
            
            this.lockedChats.add(conversationId);
            this.saveLockedChats();
            this.updateChatLockUI(conversationId, true);
            return true;
        } catch (error) {
            console.error('Error locking chat:', error);
            return false;
        }
    }

    // Unlock a chat
    async unlockChat(conversationId) {
        try {
            if (window.isSupabaseEnabled && window.authManager?.currentUser) {
                await window.supabase.rpc('unlock_conversation', {
                    p_user_id: window.authManager.currentUser.id,
                    p_conversation_id: conversationId
                });
            }
            
            this.lockedChats.delete(conversationId);
            this.saveLockedChats();
            this.updateChatLockUI(conversationId, false);
        } catch (error) {
            console.error('Error unlocking chat:', error);
        }
    }

    // Check if chat is locked
    isChatLocked(conversationId) {
        return this.lockedChats.has(conversationId);
    }

    // Show password setup modal
    showSetPasswordModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Set Chat Lock Password</h3>
                <input type="password" id="lockPassword" placeholder="Enter password" maxlength="20">
                <input type="password" id="confirmPassword" placeholder="Confirm password" maxlength="20">
                <div class="modal-buttons">
                    <button onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button onclick="chatLockManager.confirmSetPassword()">Set Password</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Confirm password setup
    confirmSetPassword() {
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
        
        this.setLockPassword(password);
        document.querySelector('.modal-overlay').remove();
        alert('Chat lock password set successfully');
    }

    // Show unlock modal
    showUnlockModal(conversationId) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>🔒 Chat Locked</h3>
                <p>Enter password to unlock this chat</p>
                <input type="password" id="unlockPassword" placeholder="Enter password" maxlength="20">
                <div class="modal-buttons">
                    <button onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button onclick="chatLockManager.confirmUnlock('${conversationId}')">Unlock</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('unlockPassword').focus();
    }

    // Confirm unlock
    confirmUnlock(conversationId) {
        const password = document.getElementById('unlockPassword').value;
        
        if (this.verifyPassword(password)) {
            this.isUnlocked = true;
            document.querySelector('.modal-overlay').remove();
            // Open the chat
            if (window.authManager && window.authManager.openChat) {
                window.authManager.openChat(conversationId);
            }
        } else {
            alert('Incorrect password');
            document.getElementById('unlockPassword').value = '';
        }
    }

    // Update chat lock UI
    updateChatLockUI(conversationId, isLocked) {
        const chatItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (chatItem) {
            if (isLocked) {
                chatItem.classList.add('locked-chat');
                const lockIcon = chatItem.querySelector('.lock-icon') || document.createElement('span');
                lockIcon.className = 'lock-icon';
                lockIcon.innerHTML = '🔒';
                chatItem.appendChild(lockIcon);
            } else {
                chatItem.classList.remove('locked-chat');
                const lockIcon = chatItem.querySelector('.lock-icon');
                if (lockIcon) lockIcon.remove();
            }
        }
    }

    // Show chat lock settings
    showChatLockSettings() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>🔒 Chat Lock Settings</h3>
                <div class="settings-section">
                    <button onclick="chatLockManager.changePassword()" class="settings-btn">
                        Change Password
                    </button>
                    <button onclick="chatLockManager.showLockedChats()" class="settings-btn">
                        View Locked Chats (${this.lockedChats.size})
                    </button>
                    <button onclick="chatLockManager.unlockAllChats()" class="settings-btn danger">
                        Unlock All Chats
                    </button>
                </div>
                <div class="modal-buttons">
                    <button onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Change password
    changePassword() {
        document.querySelector('.modal-overlay').remove();
        this.showSetPasswordModal();
    }

    // Show locked chats
    showLockedChats() {
        const chatList = [...this.lockedChats].map(id => `
            <div class="locked-chat-item">
                <span>Chat: ${id.substring(0, 20)}...</span>
                <button onclick="chatLockManager.unlockChat('${id}')" class="unlock-btn">Unlock</button>
            </div>
        `).join('');

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Locked Chats</h3>
                <div class="locked-chats-list">
                    ${chatList || '<p>No locked chats</p>'}
                </div>
                <div class="modal-buttons">
                    <button onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Unlock all chats
    unlockAllChats() {
        if (confirm('Unlock all locked chats?')) {
            this.lockedChats.clear();
            this.saveLockedChats();
            document.querySelector('.modal-overlay').remove();
            // Update UI for all chats
            document.querySelectorAll('.locked-chat').forEach(chat => {
                chat.classList.remove('locked-chat');
                const lockIcon = chat.querySelector('.lock-icon');
                if (lockIcon) lockIcon.remove();
            });
        }
    }

    // Check if chat access is allowed
    canAccessChat(conversationId) {
        if (!this.isChatLocked(conversationId)) return true;
        if (this.isUnlocked) {
            this.isUnlocked = false; // Reset after use
            return true;
        }
        return false;
    }
}

// Initialize chat lock manager
const chatLockManager = new ChatLockManager();