// Chat Settings Manager
class ChatSettingsManager {
    constructor() {
        this.isSettingsOpen = false;
    }

    showChatSettings(conversationId, userName) {
        if (this.isSettingsOpen) return;
        
        this.isSettingsOpen = true;
        
        const settingsHTML = `
            <div id="chatSettingsOverlay" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    min-width: 300px;
                    max-width: 400px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                ">
                    <div style="
                        display: flex;
                        align-items: center;
                        margin-bottom: 20px;
                        padding-bottom: 15px;
                        border-bottom: 1px solid #eee;
                    ">
                        <i class="fas fa-cog" style="color: #1e40af; margin-right: 10px;"></i>
                        <h3 style="margin: 0; color: #1e40af;">Chat Settings</h3>
                        <button onclick="window.chatSettings.closeChatSettings()" style="
                            margin-left: auto;
                            background: none;
                            border: none;
                            font-size: 18px;
                            cursor: pointer;
                            color: #666;
                        ">×</button>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <strong>Chat with: ${userName}</strong>
                    </div>
                    
                    <button onclick="window.chatSettings.confirmDeleteConversation('${conversationId}', '${userName}')" style="
                        width: 100%;
                        padding: 12px;
                        background: #dc3545;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                    ">
                        <i class="fas fa-trash"></i>
                        Delete Conversation
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', settingsHTML);
        
        // Close on overlay click
        document.getElementById('chatSettingsOverlay').onclick = (e) => {
            if (e.target.id === 'chatSettingsOverlay') {
                this.closeChatSettings();
            }
        };
    }

    confirmDeleteConversation(conversationId, userName) {
        const confirmHTML = `
            <div id="deleteConfirmOverlay" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    background: white;
                    border-radius: 12px;
                    padding: 25px;
                    max-width: 350px;
                    text-align: center;
                    box-shadow: 0 15px 40px rgba(0,0,0,0.4);
                ">
                    <div style="
                        width: 60px;
                        height: 60px;
                        background: #fee;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 20px;
                    ">
                        <i class="fas fa-exclamation-triangle" style="color: #dc3545; font-size: 24px;"></i>
                    </div>
                    
                    <h3 style="margin: 0 0 10px; color: #333;">Delete Conversation?</h3>
                    <p style="color: #666; margin: 0 0 25px; line-height: 1.4;">
                        This will permanently delete your entire conversation with <strong>${userName}</strong>. This action cannot be undone.
                    </p>
                    
                    <div style="display: flex; gap: 10px;">
                        <button onclick="window.chatSettings.cancelDelete()" style="
                            flex: 1;
                            padding: 12px;
                            background: #f8f9fa;
                            color: #666;
                            border: 1px solid #ddd;
                            border-radius: 8px;
                            cursor: pointer;
                        ">Cancel</button>
                        
                        <button onclick="window.chatSettings.deleteConversation('${conversationId}')" style="
                            flex: 1;
                            padding: 12px;
                            background: #dc3545;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                        ">Delete</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', confirmHTML);
    }

    async deleteConversation(conversationId) {
        try {
            // Show loading
            const deleteBtn = document.querySelector('#deleteConfirmOverlay button[onclick*="deleteConversation"]');
            if (deleteBtn) {
                deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
                deleteBtn.disabled = true;
            }

            // Delete from database
            const { error } = await window.supabase
                .from('messages')
                .delete()
                .eq('conversation_id', conversationId);

            if (error) throw error;

            // Close all modals
            this.cancelDelete();
            this.closeChatSettings();

            // Go back to home feed
            if (window.authManager && window.authManager.goBack) {
                window.authManager.goBack();
            }

            // Show success message
            this.showSuccessMessage('Conversation deleted successfully');

            // Refresh home feed to update conversation list
            setTimeout(() => {
                if (window.authManager && window.authManager.loadHomeFeed) {
                    window.authManager.loadHomeFeed();
                }
            }, 500);

        } catch (error) {
            console.error('Delete conversation error:', error);
            this.showErrorMessage('Failed to delete conversation');
            
            // Reset button
            const deleteBtn = document.querySelector('#deleteConfirmOverlay button[onclick*="deleteConversation"]');
            if (deleteBtn) {
                deleteBtn.innerHTML = 'Delete';
                deleteBtn.disabled = false;
            }
        }
    }

    cancelDelete() {
        const overlay = document.getElementById('deleteConfirmOverlay');
        if (overlay) overlay.remove();
    }

    closeChatSettings() {
        const overlay = document.getElementById('chatSettingsOverlay');
        if (overlay) overlay.remove();
        this.isSettingsOpen = false;
    }

    showSuccessMessage(message) {
        const messageHTML = `
            <div id="successMessage" style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                z-index: 10002;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                gap: 10px;
            ">
                <i class="fas fa-check-circle"></i>
                ${message}
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', messageHTML);
        
        setTimeout(() => {
            const msg = document.getElementById('successMessage');
            if (msg) msg.remove();
        }, 3000);
    }

    showErrorMessage(message) {
        const messageHTML = `
            <div id="errorMessage" style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #dc3545;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                z-index: 10002;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                gap: 10px;
            ">
                <i class="fas fa-exclamation-circle"></i>
                ${message}
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', messageHTML);
        
        setTimeout(() => {
            const msg = document.getElementById('errorMessage');
            if (msg) msg.remove();
        }, 3000);
    }
}

// Initialize chat settings manager
window.chatSettings = new ChatSettingsManager();