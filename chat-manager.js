// Chat Manager for BusinessConnect
class ChatManager {
    constructor() {
        this.currentConversation = null;
        this.messages = [];
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;
        this.setupEventListeners();
        await this.setupRealtimeListeners();
        this.isInitialized = true;
        console.log('ChatManager initialized');
    }

    setupEventListeners() {
        // Send message button
        const sendBtn = document.getElementById('sendMessageBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // Message input enter key
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }

        // File attachment
        const attachBtn = document.getElementById('attachFileBtn');
        if (attachBtn) {
            attachBtn.addEventListener('click', () => {
                document.getElementById('hiddenFileInput').click();
            });
        }

        // File input change
        const fileInput = document.getElementById('hiddenFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileUpload(e.target.files[0]);
                }
            });
        }
    }

    async startConversation(userId) {
        try {
            if (!window.authManager.currentUser) {
                window.authManager.showNotification('Please login first', 'error');
                return;
            }

            // Get user info
            let otherUser;
            if (window.supabase && window.isSupabaseEnabled === true) {
                const { data, error } = await window.supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();
                
                if (error) throw error;
                otherUser = data;
            } else {
                otherUser = { id: userId, full_name: 'User', username: 'user' };
            }

            this.currentConversation = {
                userId: userId,
                user: otherUser,
                conversationId: this.getConversationId(window.authManager.currentUser.id, userId)
            };

            // Update UI
            this.showChatInterface();
            this.updateChatHeader(otherUser);
            await this.loadMessages();

        } catch (error) {
            console.error('Error starting conversation:', error);
            window.authManager.showNotification('Failed to start conversation', 'error');
        }
    }

    showChatInterface() {
        // Hide home feed and show chat
        document.getElementById('homeFeed').style.display = 'none';
        document.getElementById('businessTools').style.display = 'none';
        document.getElementById('chatMessages').style.display = 'flex';
        document.getElementById('chatInputContainer').style.display = 'block';
    }

    updateChatHeader(user) {
        document.getElementById('chatTitle').textContent = user.full_name || user.username;
        document.getElementById('chatStatus').textContent = 'Online';
    }

    async loadMessages() {
        if (!this.currentConversation) return;

        try {
            const messagesContainer = document.getElementById('chatMessages');
            messagesContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #6b7280;">Loading messages...</div>';

            let messages = [];
            if (window.supabase && window.isSupabaseEnabled === true) {
                const { data, error } = await window.supabase
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', this.currentConversation.conversationId)
                    .order('timestamp', { ascending: true });
                
                if (error) throw error;
                messages = data || [];
            }

            this.displayMessages(messages);
            this.scrollToBottom();

        } catch (error) {
            console.error('Error loading messages:', error);
            document.getElementById('chatMessages').innerHTML = '<div style="text-align: center; padding: 20px; color: #ef4444;">Failed to load messages</div>';
        }
    }

    displayMessages(messages) {
        const container = document.getElementById('chatMessages');
        
        if (messages.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <i class="fas fa-comments" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <h3>Start the conversation</h3>
                    <p>Send a message to ${this.currentConversation.user.full_name || this.currentConversation.user.username}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = messages.map(msg => this.createMessageElement(msg)).join('');
    }

    createMessageElement(message) {
        const isOwn = message.sender_id === window.authManager.currentUser.id;
        const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="message ${isOwn ? 'own' : ''}">
                <div class="message-avatar">
                    ${isOwn ? 
                        (window.authManager.currentUser.full_name || window.authManager.currentUser.username).charAt(0).toUpperCase() :
                        (this.currentConversation.user.full_name || this.currentConversation.user.username).charAt(0).toUpperCase()
                    }
                </div>
                <div class="message-content">
                    <div class="message-text">${message.text}</div>
                    <div class="message-time">${time}</div>
                </div>
            </div>
        `;
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        
        if (!text || !this.currentConversation) return;

        try {
            const message = {
                conversation_id: this.currentConversation.conversationId,
                sender_id: window.authManager.currentUser.id,
                text: text,
                type: 'text'
            };

            console.log('Sending message:', message);

            // Clear input and add to UI immediately
            input.value = '';
            this.addMessageToUI({
                ...message,
                id: Date.now().toString(),
                timestamp: new Date().toISOString()
            });

            // Save to database
            if (window.supabase && window.isSupabaseEnabled === true) {
                const { data, error } = await window.supabase
                    .from('messages')
                    .insert(message)
                    .select();
                
                if (error) {
                    console.error('Supabase error details:', error);
                    throw error;
                }
                console.log('Message saved:', data);
            }

            this.scrollToBottom();

        } catch (error) {
            console.error('Error sending message:', error);
            window.authManager.showNotification('Failed to send message: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    addMessageToUI(message) {
        const container = document.getElementById('chatMessages');
        
        // Remove empty state if present
        if (container.innerHTML.includes('Start the conversation')) {
            container.innerHTML = '';
        }
        
        container.insertAdjacentHTML('beforeend', this.createMessageElement(message));
    }

    scrollToBottom() {
        const container = document.getElementById('chatMessages');
        container.scrollTop = container.scrollHeight;
    }

    getConversationId(userId1, userId2) {
        return [userId1, userId2].sort().join('_');
    }

    async setupRealtimeListeners() {
        if (!window.supabase || window.isSupabaseEnabled !== true) return;

        this.realtimeChannel = window.supabase
            .channel('messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                console.log('Real-time message received:', payload);
                const message = payload.new;
                
                // Only show if it's for current conversation and not from current user
                if (this.currentConversation && 
                    message.conversation_id === this.currentConversation.conversationId &&
                    message.sender_id !== window.authManager.currentUser.id) {
                    console.log('Adding message to UI:', message);
                    this.addMessageToUI(message);
                    this.scrollToBottom();
                }
            });

        const { error } = await this.realtimeChannel.subscribe();
        if (error) {
            console.error('Realtime subscription error:', error);
        } else {
            console.log('✅ Real-time messaging enabled');
        }
    }

    async handleFileUpload(file) {
        try {
            window.authManager.showNotification('File upload not implemented yet', 'error');
        } catch (error) {
            console.error('File upload error:', error);
        }
    }
}

// Initialize chat manager
window.chatManager = new ChatManager();