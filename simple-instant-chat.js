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
            sendBtn.onclick = () => this.sendInstant();
        }
        
        if (messageInput) {
            messageInput.onkeypress = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendInstant();
                }
            };
        }
    }

    async startConversation(userId) {
        if (!window.authManager || !window.authManager.currentUser) return;

        try {
            const { data: user } = await window.supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            this.currentConversation = {
                userId,
                user,
                conversationId: [window.authManager.currentUser.id, userId].sort().join('_')
            };

            this.showChat();
            this.updateHeader(user);
            await this.loadMessages();
            this.startPolling();
        } catch (error) {
            console.error('Start conversation error:', error);
        }
    }

    showChat() {
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
        }, 100);
    }

    updateHeader(user) {
        const chatTitle = document.getElementById('chatTitle');
        const chatStatus = document.getElementById('chatStatus');
        
        if (chatTitle) chatTitle.textContent = user.full_name || user.username;
        if (chatStatus) chatStatus.innerHTML = '<i class="fas fa-circle" style="color: #10b981; font-size: 8px; margin-right: 4px;"></i>Online';
    }

    async loadMessages() {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        container.innerHTML = '<div style="text-align: center; padding: 20px;">Loading...</div>';

        try {
            const { data } = await window.supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', this.currentConversation.conversationId)
                .order('created_at', { ascending: true });

            this.displayMessages(data || []);
        } catch (error) {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Error loading messages</div>';
        }
    }

    displayMessages(messages) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        if (messages.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">Start chatting with ' + (this.currentConversation.user.full_name || this.currentConversation.user.username) + '</div>';
            return;
        }

        container.innerHTML = messages.map(m => this.createMessageHTML(m)).join('');
        container.scrollTop = container.scrollHeight;
    }

    createMessageHTML(msg) {
        const isOwn = msg.sender_id === window.authManager.currentUser.id;
        const time = new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        const name = isOwn ? 
            (window.authManager.currentUser.full_name || window.authManager.currentUser.username) :
            (this.currentConversation.user.full_name || this.currentConversation.user.username);
        
        return '<div class="message ' + (isOwn ? 'own' : '') + '" data-message-id="' + msg.id + '">' +
               '<div class="message-avatar">' + (name || 'U').charAt(0).toUpperCase() + '</div>' +
               '<div class="message-content">' +
               '<div class="message-text">' + this.escapeHtml(msg.text) + '</div>' +
               '<div class="message-time">' + time + '</div>' +
               '</div></div>';
    }

    escapeHtml(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

        // Add to UI instantly
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

        // Add message
        container.insertAdjacentHTML('beforeend', this.createMessageHTML(msg));
        container.scrollTop = container.scrollHeight;
    }

    startPolling() {
        // Poll for new messages every 2 seconds for instant updates
        if (this.pollInterval) clearInterval(this.pollInterval);
        
        this.pollInterval = setInterval(async () => {
            if (!this.currentConversation) return;
            
            try {
                const { data } = await window.supabase
                    .from('messages')
                    .select('*')
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

    cleanup() {
        this.stopPolling();
        this.currentConversation = null;
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