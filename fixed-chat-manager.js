// Fixed Chat Manager for Instant Messaging
class FixedChatManager {
    constructor() {
        this.currentConversation = null;
        this.realtimeChannel = null;
        this.isInitialized = false;
        this.messageQueue = [];
        this.isOnline = true;
    }

    async initialize() {
        if (this.isInitialized) return;
        
        console.log('Initializing Fixed Chat Manager...');
        this.setupEventListeners();
        await this.setupRealtime();
        this.setupConnectionMonitoring();
        this.isInitialized = true;
        
        console.log('Fixed Chat Manager initialized with instant messaging');
    }

    setupEventListeners() {
        const sendBtn = document.getElementById('sendMessageBtn');
        const messageInput = document.getElementById('messageInput');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }
        
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
    }

    async startConversation(userId) {
        if (!window.authManager || !window.authManager.currentUser) {
            if (window.authManager && window.authManager.showNotification) {
                window.authManager.showNotification('Please login first', 'error');
            }
            return;
        }

        try {
            console.log('Starting conversation with user:', userId);
            
            // Get user info
            const { data: otherUser, error } = await window.supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            
            if (error) throw error;

            this.currentConversation = {
                userId: userId,
                user: otherUser,
                conversationId: this.getConversationId(window.authManager.currentUser.id, userId)
            };

            console.log('Conversation ID:', this.currentConversation.conversationId);
            
            this.showChatInterface();
            this.updateChatHeader(otherUser);
            await this.loadMessages();
            
            // Mark conversation as read
            this.markConversationAsRead();

        } catch (error) {
            console.error('Error starting conversation:', error);
            if (window.authManager && window.authManager.showNotification) {
                window.authManager.showNotification('Failed to start conversation: ' + error.message, 'error');
            }
        }
    }

    showChatInterface() {
        // Hide other sections
        const homeFeed = document.getElementById('homeFeed');
        const businessTools = document.getElementById('businessTools');
        const chatMessages = document.getElementById('chatMessages');
        const chatInputContainer = document.getElementById('chatInputContainer');
        
        if (homeFeed) homeFeed.style.display = 'none';
        if (businessTools) businessTools.style.display = 'none';
        if (chatMessages) chatMessages.style.display = 'flex';
        if (chatInputContainer) chatInputContainer.style.display = 'block';
        
        // Focus message input
        setTimeout(() => {
            const messageInput = document.getElementById('messageInput');
            if (messageInput) messageInput.focus();
        }, 100);
    }

    updateChatHeader(user) {
        const chatTitle = document.getElementById('chatTitle');
        const chatStatus = document.getElementById('chatStatus');
        
        if (chatTitle) {
            chatTitle.textContent = user.full_name || user.username;
        }
        
        if (chatStatus) {
            chatStatus.innerHTML = '<i class="fas fa-circle" style="color: #10b981; font-size: 8px; margin-right: 4px;"></i>Active now';
        }
    }

    async loadMessages() {
        if (!this.currentConversation) return;

        try {
            console.log('Loading messages for conversation:', this.currentConversation.conversationId);
            
            const messagesContainer = document.getElementById('chatMessages');
            if (messagesContainer) {
                messagesContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #6b7280;"><i class="fas fa-spinner fa-spin"></i> Loading messages...</div>';
            }

            // Use the SQL function for better performance
            let messages = [];
            try {
                const { data, error } = await window.supabase
                    .rpc('get_conversation_messages', {
                        conv_id: this.currentConversation.conversationId
                    });
                
                if (error) throw error;
                messages = data || [];
            } catch (funcError) {
                console.log('SQL function failed, using direct query:', funcError);
                
                // Fallback to direct query
                const { data, error } = await window.supabase
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', this.currentConversation.conversationId)
                    .order('created_at', { ascending: true });
                
                if (error) throw error;
                messages = data || [];
            }

            console.log('Loaded ' + messages.length + ' messages');
            this.displayMessages(messages);
            this.scrollToBottom();

        } catch (error) {
            console.error('Error loading messages:', error);
            const messagesContainer = document.getElementById('chatMessages');
            if (messagesContainer) {
                messagesContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #ef4444;"><i class="fas fa-exclamation-triangle"></i><p>Failed to load messages</p><button onclick="window.chatManager.loadMessages()" style="background: #1e40af; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin-top: 8px;"><i class="fas fa-refresh"></i> Retry</button></div>';
            }
        }
    }

    displayMessages(messages) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        if (messages.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #6b7280;"><i class="fas fa-comments" style="font-size: 48px; margin-bottom: 16px; color: #d1d5db;"></i><h3>Start the conversation</h3><p>Send a message to ' + (this.currentConversation.user.full_name || this.currentConversation.user.username) + '</p></div>';
            return;
        }

        container.innerHTML = messages.map(msg => this.createMessageElement(msg)).join('');
    }

    createMessageElement(message) {
        const isOwn = message.sender_id === (window.authManager && window.authManager.currentUser ? window.authManager.currentUser.id : null);
        const time = new Date(message.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const senderName = message.sender_name || 
                          (isOwn && window.authManager && window.authManager.currentUser ? window.authManager.currentUser.full_name : 
                           this.currentConversation && this.currentConversation.user ? this.currentConversation.user.username : 'User');
        
        const avatarText = isOwn ? 
            (window.authManager && window.authManager.currentUser ? 
             (window.authManager.currentUser.full_name || window.authManager.currentUser.username || 'U').charAt(0).toUpperCase() : 'U') :
            (senderName || 'U').charAt(0).toUpperCase();
        
        return '<div class="message ' + (isOwn ? 'own' : '') + '" data-message-id="' + message.id + '">' +
               '<div class="message-avatar">' + avatarText + '</div>' +
               '<div class="message-content">' +
               '<div class="message-text">' + this.escapeHtml(message.text) + '</div>' +
               '<div class="message-time">' + time + '</div>' +
               '</div></div>';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input && input.value ? input.value.trim() : '';
        
        if (!text || !this.currentConversation) return;

        try {
            console.log('Sending message:', text);
            
            // Clear input immediately for better UX
            input.value = '';
            
            // Create temporary message for instant UI feedback
            const tempMessage = {
                id: 'temp-' + Date.now(),
                conversation_id: this.currentConversation.conversationId,
                sender_id: window.authManager.currentUser.id,
                text: text,
                created_at: new Date().toISOString(),
                sender_name: window.authManager.currentUser.full_name || window.authManager.currentUser.username
            };
            
            // Add to UI immediately
            this.addMessageToUI(tempMessage);
            this.scrollToBottom();

            // Send to database
            let messageId;
            try {
                // Try SQL function first
                const { data, error } = await window.supabase
                    .rpc('send_message', {
                        conv_id: this.currentConversation.conversationId,
                        message_text: text
                    });
                
                if (error) throw error;
                messageId = data;
                console.log('Message sent via SQL function, ID:', messageId);
            } catch (funcError) {
                console.log('SQL function failed, trying direct insert:', funcError);
                
                // Fallback to direct insert
                const { data, error } = await window.supabase
                    .from('messages')
                    .insert({
                        conversation_id: this.currentConversation.conversationId,
                        sender_id: window.authManager.currentUser.id,
                        text: text
                    })
                    .select()
                    .single();
                
                if (error) throw error;
                messageId = data.id;
                console.log('Message sent via direct insert, ID:', messageId);
            }

            // Update temp message with real ID
            const tempElement = document.querySelector('[data-message-id="' + tempMessage.id + '"]');
            if (tempElement) {
                tempElement.setAttribute('data-message-id', messageId);
            }

        } catch (error) {
            console.error('Error sending message:', error);
            
            // Remove temp message on error
            const tempElement = document.querySelector('[data-message-id="' + tempMessage.id + '"]');
            if (tempElement) {
                tempElement.remove();
            }
            
            // Restore input value
            if (input) input.value = text;
            
            if (window.authManager && window.authManager.showNotification) {
                window.authManager.showNotification('Failed to send message: ' + error.message, 'error');
            }
        }
    }

    addMessageToUI(message) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        // Remove welcome message if present
        if (container.innerHTML.includes('Start the conversation')) {
            container.innerHTML = '';
        }
        
        // Check if message already exists (avoid duplicates)
        const existingMessage = container.querySelector('[data-message-id="' + message.id + '"]');
        if (existingMessage) return;
        
        container.insertAdjacentHTML('beforeend', this.createMessageElement(message));
    }

    scrollToBottom() {
        const container = document.getElementById('chatMessages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    getConversationId(userId1, userId2) {
        return [userId1, userId2].sort().join('_');
    }

    async setupRealtime() {
        if (!window.supabase) {
            console.warn('Supabase not available, realtime disabled');
            return;
        }

        try {
            console.log('Setting up realtime messaging...');
            
            this.realtimeChannel = window.supabase
                .channel('instant-messages-v2')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                }, (payload) => {
                    console.log('Real-time message received:', payload);
                    this.handleRealtimeMessage(payload.new);
                });

            const { error } = await this.realtimeChannel.subscribe();
            
            if (error) {
                throw error;
            }
            
            console.log('Realtime messaging enabled');
            
        } catch (error) {
            console.error('Realtime setup failed:', error);
            // Continue without realtime
        }
    }

    handleRealtimeMessage(message) {
        // Only process if we have an active conversation
        if (!this.currentConversation) return;
        
        // Only show messages for current conversation
        if (message.conversation_id !== this.currentConversation.conversationId) return;
        
        // Don't show our own messages (already added to UI)
        if (message.sender_id === (window.authManager && window.authManager.currentUser ? window.authManager.currentUser.id : null)) return;
        
        console.log('Adding incoming message to UI');
        
        // Add sender info and display
        this.addIncomingMessage(message);
    }

    async addIncomingMessage(message) {
        try {
            // Get sender info
            const { data: sender } = await window.supabase
                .from('profiles')
                .select('full_name, username, profile_photo')
                .eq('id', message.sender_id)
                .single();
            
            message.sender_name = (sender && sender.full_name) || (sender && sender.username) || 'User';
            message.sender_photo = sender && sender.profile_photo;
            
            this.addMessageToUI(message);
            this.scrollToBottom();
            
        } catch (error) {
            console.error('Error getting sender info:', error);
            message.sender_name = 'User';
            this.addMessageToUI(message);
            this.scrollToBottom();
        }
    }

    markConversationAsRead() {
        if (!this.currentConversation) return;
        
        const conversationId = this.currentConversation.conversationId;
        const timestamp = new Date().toISOString();
        
        localStorage.setItem('last_read_' + conversationId, timestamp);
    }

    setupConnectionMonitoring() {
        // Monitor online/offline status
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Connection restored');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Connection lost');
        });
    }

    cleanup() {
        if (this.realtimeChannel) {
            this.realtimeChannel.unsubscribe();
            this.realtimeChannel = null;
        }
        
        this.currentConversation = null;
        console.log('Chat manager cleaned up');
    }
}

// Replace the existing chat manager
if (window.chatManager) {
    if (window.chatManager.cleanup) {
        window.chatManager.cleanup();
    }
}

window.chatManager = new FixedChatManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
            window.chatManager.initialize();
        }, 100);
    });
} else {
    setTimeout(function() {
        window.chatManager.initialize();
    }, 100);
}

console.log('Fixed Chat Manager loaded');