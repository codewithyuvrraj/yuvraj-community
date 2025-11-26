// Simple Instant Chat - No Realtime Dependencies
class SimpleInstantChat {
    constructor() {
        this.currentConversation = null;
        this.pollInterval = null;
    }

    initialize() {
        console.log('Simple Instant Chat initializing...');
        this.setupEventListeners();
        console.log('Simple Instant Chat ready');
    }

    setupEventListeners() {
        const sendBtn = document.getElementById('sendMessageBtn');
        const messageInput = document.getElementById('messageInput');
        
        if (sendBtn) {
            sendBtn.onclick = () => {
                if (window.groupChatManager && window.groupChatManager.currentGroup) {
                    window.groupChatManager.sendGroupMessage();
                } else {
                    this.sendInstant();
                }
            };
        }
        
        if (messageInput) {
            messageInput.onkeypress = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (window.groupChatManager && window.groupChatManager.currentGroup) {
                        window.groupChatManager.sendGroupMessage();
                    } else {
                        this.sendInstant();
                    }
                }
            };
        }
    }

    async startConversation(userId) {
        if (!window.authManager || !window.authManager.currentUser) return;

        const conversationId = [window.authManager.currentUser.id, userId].sort().join('_');
        
        // Check if chat is locked
        if (window.chatLockManager && window.chatLockManager.isChatLocked(conversationId)) {
            if (!window.chatLockManager.canAccessChat(conversationId)) {
                window.chatLockManager.showUnlockModal(conversationId);
                return;
            }
        }

        try {
            const { data: user } = await window.supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            this.currentConversation = {
                userId,
                user,
                conversationId
            };

            this.showChat();
            this.updateHeader(user);
            await this.loadMessages();
            
            // Mark conversation as read when opening
            this.markConversationAsRead();
            
            this.startPolling();
        } catch (error) {
            console.error('Start conversation error:', error);
        }
    }

    async startGroupConversation(groupId) {
        if (!window.authManager || !window.authManager.currentUser) return;

        try {
            // Use the dedicated group chat manager
            if (window.groupChatManager) {
                await window.groupChatManager.startGroupChat(groupId);
            }
        } catch (error) {
            console.error('Start group conversation error:', error);
        }
    }

    showChat() {
        const homeFeed = document.getElementById('homeFeed');
        const businessTools = document.getElementById('businessTools');
        const chatMessages = document.getElementById('chatMessages');
        const chatInputContainer = document.getElementById('chatInputContainer');
        const backBtn = document.getElementById('backBtn');
        
        if (homeFeed) homeFeed.style.display = 'none';
        if (businessTools) businessTools.style.display = 'none';
        if (chatMessages) chatMessages.style.display = 'flex';
        if (chatInputContainer) chatInputContainer.style.display = 'block';
        if (backBtn) backBtn.style.display = 'block';
        
        // Push chat state to history to handle back button
        if (this.currentConversation) {
            history.pushState({ inChat: true, userId: this.currentConversation.userId }, '', '#chat');
        }
        
        setTimeout(() => {
            const messageInput = document.getElementById('messageInput');
            if (messageInput) messageInput.focus();
            
            // Mark conversation as read when chat is shown
            this.markConversationAsRead();
        }, 100);
    }

    updateHeader(user) {
        const chatTitle = document.getElementById('chatTitle');
        const chatStatus = document.getElementById('chatStatus');
        const chatOptionsBtn = document.getElementById('chatOptionsBtn');
        
        if (chatTitle) {
            chatTitle.textContent = user.full_name || user.username;
            chatTitle.style.cursor = 'pointer';
            chatTitle.onclick = () => {
                if (window.authManager) {
                    window.authManager.showChatOptions(user.id, user.full_name || user.username);
                }
            };
        }
        
        if (chatStatus && window.authManager) {
            const statusColor = window.authManager.getUserStatusColor();
            const statusText = window.authManager.getUserStatusText();
            chatStatus.innerHTML = `<i class="fas fa-circle" style="color: ${statusColor}; font-size: 8px; margin-right: 4px;"></i>${statusText}`;
        }
        
        if (chatOptionsBtn) {
            chatOptionsBtn.style.display = 'none';
        }
        
        // Show delete chat button in settings if available
        if (window.authManager && window.authManager.showDeleteChatInSettings) {
            window.authManager.showDeleteChatInSettings();
        }
        
        // Update chat lock UI
        if (window.chatLockManager) {
            const conversationId = this.currentConversation.conversationId;
            window.chatLockManager.updateChatLockUI(conversationId, window.chatLockManager.isChatLocked(conversationId));
        }
    }

    updateGroupHeader(groupId) {
        const chatTitle = document.getElementById('chatTitle');
        const chatStatus = document.getElementById('chatStatus');
        const chatOptionsBtn = document.getElementById('chatOptionsBtn');
        
        if (chatTitle) {
            chatTitle.textContent = 'Group ' + groupId;
            chatTitle.style.cursor = 'default';
            chatTitle.onclick = null;
        }
        
        if (chatStatus) {
            chatStatus.innerHTML = '<i class="fas fa-users" style="color: #25d366; font-size: 8px; margin-right: 4px;"></i>Group Chat';
        }
        
        if (chatOptionsBtn) {
            chatOptionsBtn.style.display = 'none';
        }
    }

    async loadMessages() {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        // Show typing indicator
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #667781;"><i class="fas fa-circle" style="animation: pulse 1s infinite;"></i> <i class="fas fa-circle" style="animation: pulse 1s infinite 0.2s;"></i> <i class="fas fa-circle" style="animation: pulse 1s infinite 0.4s;"></i></div>';

        try {
            const { data } = await window.supabase
                .from('messages')
                .select(`
                    *,
                    sender:profiles!messages_sender_id_fkey(
                        id,
                        full_name,
                        username,
                        profile_photo
                    )
                `)
                .eq('conversation_id', this.currentConversation.conversationId)
                .order('created_at', { ascending: true });

            // Small delay to show loading animation
            setTimeout(() => {
                this.displayMessages(data || []);
            }, 300);
        } catch (error) {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: #e74c3c;">Error loading messages</div>';
        }
    }

    async loadGroupMessages() {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        // Show typing indicator
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #667781;"><i class="fas fa-circle" style="animation: pulse 1s infinite;"></i> <i class="fas fa-circle" style="animation: pulse 1s infinite 0.2s;"></i> <i class="fas fa-circle" style="animation: pulse 1s infinite 0.4s;"></i></div>';

        // Small delay to show loading animation
        setTimeout(() => {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #667781;">Group chat functionality coming soon!</div>';
        }, 300);
    }

    displayMessages(messages) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        if (messages.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #667781;">Start chatting with ' + (this.currentConversation.user.full_name || this.currentConversation.user.username) + '</div>';
            return;
        }

        // Clear container
        container.innerHTML = '';
        
        // Add messages vertically with staggered animation
        messages.forEach((msg, index) => {
            setTimeout(() => {
                const messageEl = document.createElement('div');
                messageEl.innerHTML = this.createMessageHTML(msg);
                const messageNode = messageEl.firstChild;
                
                // Add to container
                container.appendChild(messageNode);
                
                // Smooth scroll to bottom after last message
                if (index === messages.length - 1) {
                    setTimeout(() => {
                        container.scrollTo({
                            top: container.scrollHeight,
                            behavior: 'smooth'
                        });
                    }, 100);
                }
            }, index * 30); // 30ms delay between messages for vertical loading effect
        });
    }

    createMessageHTML(msg) {
        const isOwn = msg.sender_id === window.authManager.currentUser.id;
        const time = new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        
        // Get sender data from the message (includes profile info from join)
        const senderData = msg.sender || (isOwn ? window.authManager.currentUser : this.currentConversation.user);
        
        const name = senderData.full_name || senderData.username;
        const profilePhoto = senderData.profile_photo;
        
        // Create avatar HTML with profile photo or initials
        const avatarContent = profilePhoto ? 
            `<img src="${profilePhoto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` :
            this.escapeHtml((name || 'U').charAt(0).toUpperCase());
        
        return `<div class="message ${isOwn ? 'own' : ''}" data-message-id="${msg.id}">
               ${isOwn ? '' : `<div class="message-avatar">${avatarContent}</div>`}
               <div class="message-content">
               <div class="message-text">${this.escapeHtml(msg.text || '')}</div>
               <div class="message-time">${time}</div>
               </div></div>`;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async sendInstant() {
        const input = document.getElementById('messageInput');
        if (!input) return;
        
        const text = input.value.trim();
        if (!text || !this.currentConversation) return;

        // Clear input instantly
        input.value = '';

        // Create temp message for instant UI
        const tempMsg = {
            id: 'temp-' + Date.now(),
            conversation_id: this.currentConversation.conversationId,
            sender_id: window.authManager.currentUser.id,
            text: text,
            created_at: new Date().toISOString()
        };

        // Add to UI instantly with slide animation
        this.addMessageToUI(tempMsg);

        // Send to database
        try {
            const { data, error } = await window.supabase
                .from('messages')
                .insert({
                    conversation_id: this.currentConversation.conversationId,
                    sender_id: window.authManager.currentUser.id,
                    text: text
                })
                .select()
                .single();

            if (!error && data) {
                // Update temp message with real ID
                const element = document.querySelector('[data-message-id="' + tempMsg.id + '"]');
                if (element) element.setAttribute('data-message-id', data.id);
                
                // Mark conversation as read after sending (user is actively chatting)
                this.markConversationAsRead();
            }
        } catch (error) {
            console.error('Send error:', error);
            // Remove temp message on error
            const element = document.querySelector('[data-message-id="' + tempMsg.id + '"]');
            if (element) element.remove();
            // Restore input
            input.value = text;
        }
    }

    addMessageToUI(msg) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        // Remove welcome message
        if (container.innerHTML.includes('Start chatting')) {
            container.innerHTML = '';
        }

        // Check for duplicates
        if (document.querySelector('[data-message-id="' + msg.id + '"]')) return;

        // Create message element
        const messageEl = document.createElement('div');
        messageEl.innerHTML = this.createMessageHTML(msg);
        const messageNode = messageEl.firstChild;
        
        // Add fade-in animation
        messageNode.style.opacity = '0';
        messageNode.style.transform = 'translateY(10px)';
        
        container.appendChild(messageNode);
        
        // Animate in
        requestAnimationFrame(() => {
            messageNode.style.transition = 'all 0.3s ease-out';
            messageNode.style.transform = 'translateY(0)';
            messageNode.style.opacity = '1';
        });
        
        // Smooth scroll to bottom
        setTimeout(() => {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }

    startPolling() {
        // Poll for new messages every 2 seconds for instant updates
        if (this.pollInterval) clearInterval(this.pollInterval);
        
        this.pollInterval = setInterval(async () => {
            if (!this.currentConversation) return;
            
            try {
                const { data } = await window.supabase
                    .from('messages')
                    .select(`
                        *,
                        sender:profiles!messages_sender_id_fkey(
                            id,
                            full_name,
                            username,
                            profile_photo
                        )
                    `)
                    .eq('conversation_id', this.currentConversation.conversationId)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (data && data.length > 0) {
                    // Check for new messages
                    data.reverse().forEach(msg => {
                        if (!document.querySelector('[data-message-id="' + msg.id + '"]')) {
                            // Only add if it's not from current user (avoid duplicates)
                            if (msg.sender_id !== window.authManager.currentUser.id) {
                                this.addMessageToUI(msg);
                                // Mark as read since user is actively viewing the conversation
                                this.markConversationAsRead();
                            }
                        }
                    });
                }
            } catch (error) {
                console.log('Polling error:', error);
            }
        }, 1000); // Poll every 1 second for fast updates
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    async markConversationAsRead() {
        if (!this.currentConversation) return;
        
        const conversationId = this.currentConversation.conversationId;
        
        try {
            if (window.supabase && window.authManager && window.authManager.currentUser) {
                await window.supabase.rpc('update_message_read_status', {
                    p_user_id: window.authManager.currentUser.id,
                    p_conversation_id: conversationId
                });
            }
        } catch (error) {
            console.error('Error marking conversation as read:', error);
        }
    }

    async cleanup() {
        this.stopPolling();
        
        // Mark conversation as read before cleanup
        if (this.currentConversation) {
            await this.markConversationAsRead();
            
            // Clear unlock status for messages when leaving chat
            if (window.lockManager) {
                window.lockManager.clearUnlockStatus('messages');
            }
            
            // Force home feed refresh after cleanup
            setTimeout(() => {
                if (window.authManager && window.authManager.loadHomeFeed) {
                    window.authManager.loadHomeFeed();
                }
            }, 300);
        }
        
        // Also cleanup group chat if active
        if (window.groupChatManager && window.groupChatManager.currentGroup) {
            window.groupChatManager.cleanup();
        }
        
        this.currentConversation = null;
        
        // Reset header and hide buttons
        const chatTitle = document.getElementById('chatTitle');
        const chatStatus = document.getElementById('chatStatus');
        const chatOptionsBtn = document.getElementById('chatOptionsBtn');
        const backBtn = document.getElementById('backBtn');
        
        if (chatTitle) {
            chatTitle.textContent = 'BusinessConnect';
            chatTitle.style.cursor = 'default';
            chatTitle.onclick = null;
        }
        if (chatStatus) chatStatus.innerHTML = '';
        if (chatOptionsBtn) chatOptionsBtn.style.display = 'none';
        if (backBtn) backBtn.style.display = 'none';
        
        // Hide delete chat button in settings
        if (window.authManager && window.authManager.hideDeleteChatInSettings) {
            window.authManager.hideDeleteChatInSettings();
        }
    }
}

// Replace chat manager
if (window.chatManager && window.chatManager.cleanup) {
    window.chatManager.cleanup();
}

window.chatManager = new SimpleInstantChat();

// Initialize immediately
window.chatManager.initialize();

console.log('Simple Instant Chat loaded');