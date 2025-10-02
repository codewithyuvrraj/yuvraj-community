// Instant Bidirectional Chat Manager
class InstantChatManager {
    constructor() {
        this.currentConversation = null;
        this.realtimeChannel = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;
        
        console.log('Initializing Instant Chat Manager...');
        this.setupEventListeners();
        await this.setupGlobalRealtime();
        this.isInitialized = true;
        
        console.log('Instant Chat Manager ready');
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

    async setupGlobalRealtime() {
        if (!window.supabase) return;

        try {
            // Create a global channel that listens to ALL message inserts
            this.realtimeChannel = window.supabase
                .channel('global-messages')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                }, (payload) => {
                    console.log('Global message received:', payload.new);
                    this.handleGlobalMessage(payload.new);
                });

            await this.realtimeChannel.subscribe();
            console.log('Global realtime messaging enabled');
            
        } catch (error) {
            console.error('Realtime setup failed:', error);
        }
    }

    handleGlobalMessage(message) {
        // Only process if we have an active conversation
        if (!this.currentConversation) return;
        
        // Check if this message belongs to current conversation
        const currentUserId = window.authManager && window.authManager.currentUser ? window.authManager.currentUser.id : null;
        if (!currentUserId) return;
        
        // Check if message is for current conversation
        const isForCurrentConversation = message.conversation_id === this.currentConversation.conversationId;
        if (!isForCurrentConversation) return;
        
        // Don't show our own messages (already added to UI)
        if (message.sender_id === currentUserId) return;
        
        console.log('Adding incoming message instantly');
        this.addIncomingMessageInstantly(message);
    }

    async addIncomingMessageInstantly(message) {
        // Add message immediately without waiting for sender info
        message.sender_name = 'User';
        this.addMessageToUI(message);
        this.scrollToBottom();
        
        // Get sender info in background and update
        try {
            const { data: sender } = await window.supabase
                .from('profiles')
                .select('full_name, username')
                .eq('id', message.sender_id)
                .single();
            
            if (sender) {
                message.sender_name = sender.full_name || sender.username || 'User';
                // Update the message element with correct sender name
                const messageElement = document.querySelector('[data-message-id="' + message.id + '"]');
                if (messageElement) {
                    const avatar = messageElement.querySelector('.message-avatar');
                    if (avatar) {
                        avatar.textContent = message.sender_name.charAt(0).toUpperCase();
                    }
                }
            }
        } catch (error) {
            console.log('Could not get sender info:', error);
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
            console.log('Starting instant conversation with:', userId);
            
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

            console.log('Conversation ready:', this.currentConversation.conversationId);
            
            this.showChatInterface();
            this.updateChatHeader(otherUser);
            await this.loadMessages();

        } catch (error) {
            console.error('Error starting conversation:', error);
            if (window.authManager && window.authManager.showNotification) {
                window.authManager.showNotification('Failed to start conversation', 'error');
            }
        }
    }

    showChatInterface() {
        const homeFeed = document.getElementById('homeFeed');
        const businessTools = document.getElementById('businessTools');
        const chatMessages = document.getElementById('chatMessages');
        const chatInputContainer = document.getElementById('chatInputContainer');
        
        if (homeFeed) homeFeed.style.display = 'none';
        if (businessTools) businessTools.style.display = 'none';
        if (chatMessages) chatMessages.style.display = 'flex';
        if (chatInputContainer) chatInputContainer.style.display = 'block';
        
        setTimeout(() => {
            const messageInput = document.getElementById('messageInput');
            if (messageInput) messageInput.focus();
        }, 50);
    }

    updateChatHeader(user) {
        const chatTitle = document.getElementById('chatTitle');
        const chatStatus = document.getElementById('chatStatus');
        
        if (chatTitle) {
            chatTitle.textContent = user.full_name || user.username;
        }
        
        if (chatStatus) {
            chatStatus.innerHTML = '<i class="fas fa-circle" style="color: #10b981; font-size: 8px; margin-right: 4px;"></i>Online';
        }
    }

    async loadMessages() {
        if (!this.currentConversation) return;

        try {
            const messagesContainer = document.getElementById('chatMessages');
            if (messagesContainer) {
                messagesContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #6b7280;">Loading...</div>';
            }

            const { data: messages, error } = await window.supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', this.currentConversation.conversationId)
                .order('created_at', { ascending: true });
            
            if (error) throw error;

            console.log('Loaded messages:', messages.length);
            this.displayMessages(messages || []);
            this.scrollToBottom();

        } catch (error) {
            console.error('Error loading messages:', error);
            const messagesContainer = document.getElementById('chatMessages');
            if (messagesContainer) {
                messagesContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #ef4444;">Failed to load messages</div>';
            }
        }
    }

    displayMessages(messages) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        if (messages.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #6b7280;"><h3>Start chatting</h3><p>Send a message to ' + (this.currentConversation.user.full_name || this.currentConversation.user.username) + '</p></div>';
            return;
        }

        container.innerHTML = messages.map(msg => this.createMessageElement(msg)).join('');
    }

    createMessageElement(message) {
        const currentUserId = window.authManager && window.authManager.currentUser ? window.authManager.currentUser.id : null;
        const isOwn = message.sender_id === currentUserId;
        const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const senderName = message.sender_name || 
                          (isOwn ? (window.authManager.currentUser.full_name || window.authManager.currentUser.username) : 
                           (this.currentConversation.user.full_name || this.currentConversation.user.username)) || 'User';
        
        const avatarText = senderName.charAt(0).toUpperCase();
        
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
            console.log('Sending instant message:', text);
            
            // Clear input immediately
            input.value = '';
            
            // Create temp message for instant UI
            const tempMessage = {
                id: 'temp-' + Date.now(),
                conversation_id: this.currentConversation.conversationId,
                sender_id: window.authManager.currentUser.id,
                text: text,
                created_at: new Date().toISOString(),
                sender_name: window.authManager.currentUser.full_name || window.authManager.currentUser.username
            };
            
            // Add to UI instantly
            this.addMessageToUI(tempMessage);
            this.scrollToBottom();

            // Send to database (this will trigger realtime for other user)
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

            // Update temp message with real ID
            const tempElement = document.querySelector('[data-message-id="' + tempMessage.id + '"]');
            if (tempElement) {
                tempElement.setAttribute('data-message-id', data.id);
            }

            console.log('Message sent instantly, ID:', data.id);

        } catch (error) {
            console.error('Error sending message:', error);
            
            // Remove temp message on error
            const tempElement = document.querySelector('[data-message-id="' + tempMessage.id + '"]');
            if (tempElement) {
                tempElement.remove();
            }
            
            // Restore input
            if (input) input.value = text;
            
            if (window.authManager && window.authManager.showNotification) {
                window.authManager.showNotification('Failed to send message', 'error');
            }
        }
    }

    addMessageToUI(message) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        // Remove welcome message
        if (container.innerHTML.includes('Start chatting')) {
            container.innerHTML = '';
        }
        
        // Check for duplicates
        const existing = container.querySelector('[data-message-id="' + message.id + '"]');
        if (existing) return;
        
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

    cleanup() {
        if (this.realtimeChannel) {
            this.realtimeChannel.unsubscribe();
            this.realtimeChannel = null;
        }
        this.currentConversation = null;
    }
}

// Replace existing chat manager
if (window.chatManager && window.chatManager.cleanup) {
    window.chatManager.cleanup();
}

window.chatManager = new InstantChatManager();

// Initialize immediately
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        window.chatManager.initialize();
    });
} else {
    window.chatManager.initialize();
}

console.log('Instant Chat Manager loaded');