// Simple Chat Manager with SQL Functions
class SimpleChatManager {
    constructor() {
        this.currentConversation = null;
        this.realtimeChannel = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;
        this.setupEventListeners();
        await this.setupRealtime();
        this.isInitialized = true;
        console.log('SimpleChatManager initialized');
    }

    setupEventListeners() {
        const sendBtn = document.getElementById('sendMessageBtn');
        const messageInput = document.getElementById('messageInput');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }
        
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
        }
    }

    async startConversation(userId) {
        if (!window.authManager.currentUser) {
            window.authManager.showNotification('Please login first', 'error');
            return;
        }

        try {
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

            this.showChatInterface();
            this.updateChatHeader(otherUser);
            await this.loadMessages();

        } catch (error) {
            console.error('Error starting conversation:', error);
            window.authManager.showNotification('Failed to start conversation', 'error');
        }
    }

    showChatInterface() {
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

            // Get messages directly from table
            const { data: messages, error } = await window.supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', this.currentConversation.conversationId)
                .order('created_at', { ascending: true });
            
            if (error) throw error;

            this.displayMessages(messages || []);
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
        const time = new Date(message.created_at || message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="message ${isOwn ? 'own' : ''}">
                <div class="message-avatar">
                    ${isOwn ? 
                        (window.authManager.currentUser.full_name || window.authManager.currentUser.username).charAt(0).toUpperCase() :
                        (message.sender_name || this.currentConversation.user.username).charAt(0).toUpperCase()
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
            // Clear input immediately
            input.value = '';

            // Add to UI immediately for instant feedback
            this.addMessageToUI({
                id: 'temp-' + Date.now(),
                conversation_id: this.currentConversation.conversationId,
                sender_id: window.authManager.currentUser.id,
                text: text,
                created_at: new Date().toISOString(),
                sender_name: window.authManager.currentUser.full_name
            });

            // Try SQL function first, fallback to direct insert
            let messageId;
            try {
                const { data, error } = await window.supabase
                    .rpc('send_message', {
                        conv_id: this.currentConversation.conversationId,
                        message_text: text
                    });
                
                if (error) throw error;
                messageId = data;
            } catch (funcError) {
                console.log('SQL function failed, trying direct insert:', funcError);
                
                const { data, error } = await window.supabase
                    .from('messages')
                    .insert({
                        conversation_id: this.currentConversation.conversationId,
                        sender_id: window.authManager.currentUser.id,
                        text: text
                    })
                    .select();
                
                if (error) throw error;
                messageId = data[0]?.id;
            }

            console.log('Message sent with ID:', messageId);
            this.scrollToBottom();

        } catch (error) {
            console.error('Error sending message:', error);
            window.authManager.showNotification('Failed to send message', 'error');
        }
    }

    addMessageToUI(message) {
        const container = document.getElementById('chatMessages');
        
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

    async setupRealtime() {
        if (!window.supabase) return;

        this.realtimeChannel = window.supabase
            .channel('instant-messages')
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
                    
                    // Get sender info and add to UI
                    this.addIncomingMessage(message);
                }
            });

        const { error } = await this.realtimeChannel.subscribe();
        if (error) {
            console.error('Realtime subscription error:', error);
        } else {
            console.log('✅ Instant messaging enabled');
        }
    }

    async addIncomingMessage(message) {
        // Get sender info
        try {
            const { data: sender } = await window.supabase
                .from('profiles')
                .select('full_name, username')
                .eq('id', message.sender_id)
                .single();
            
            message.sender_name = sender?.full_name || sender?.username || 'User';
            this.addMessageToUI(message);
            this.scrollToBottom();
        } catch (error) {
            console.error('Error getting sender info:', error);
            message.sender_name = 'User';
            this.addMessageToUI(message);
            this.scrollToBottom();
        }
    }
}

// Replace the existing chat manager
window.chatManager = new SimpleChatManager();