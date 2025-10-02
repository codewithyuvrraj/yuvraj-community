// Ultra Fast Chat Manager - Zero Delay Messaging
class UltraFastChat {
    constructor() {
        this.currentConversation = null;
        this.realtimeChannel = null;
        this.messageCache = new Map();
    }

    async initialize() {
        console.log('Ultra Fast Chat initializing...');
        this.setupEventListeners();
        this.setupInstantRealtime();
        console.log('Ultra Fast Chat ready');
    }

    setupEventListeners() {
        const sendBtn = document.getElementById('sendMessageBtn');
        const messageInput = document.getElementById('messageInput');
        
        if (sendBtn) sendBtn.onclick = () => this.sendInstant();
        if (messageInput) {
            messageInput.onkeypress = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendInstant();
                }
            };
        }
    }

    setupInstantRealtime() {
        if (!window.supabase) return;

        this.realtimeChannel = window.supabase
            .channel('ultra-fast')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                this.handleInstantMessage(payload.new);
            })
            .subscribe();
    }

    handleInstantMessage(message) {
        if (!this.currentConversation) return;
        if (message.conversation_id !== this.currentConversation.conversationId) return;
        if (message.sender_id === window.authManager.currentUser.id) return;
        
        // Add instantly without any delays
        this.addToUI(message);
    }

    async startConversation(userId) {
        if (!window.authManager?.currentUser) return;

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
            this.loadInstant();
        } catch (error) {
            console.error('Start conversation error:', error);
        }
    }

    showChat() {
        document.getElementById('homeFeed').style.display = 'none';
        document.getElementById('businessTools').style.display = 'none';
        document.getElementById('chatMessages').style.display = 'flex';
        document.getElementById('chatInputContainer').style.display = 'block';
        document.getElementById('messageInput').focus();
    }

    updateHeader(user) {
        document.getElementById('chatTitle').textContent = user.full_name || user.username;
        document.getElementById('chatStatus').innerHTML = '<i class="fas fa-circle" style="color: #10b981; font-size: 8px; margin-right: 4px;"></i>Online';
    }

    async loadInstant() {
        const container = document.getElementById('chatMessages');
        container.innerHTML = '<div style="text-align: center; padding: 20px;">Loading...</div>';

        try {
            const { data } = await window.supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', this.currentConversation.conversationId)
                .order('created_at', { ascending: true });

            this.displayAll(data || []);
        } catch (error) {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Error loading</div>';
        }
    }

    displayAll(messages) {
        const container = document.getElementById('chatMessages');
        
        if (messages.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">Start chatting with ' + this.currentConversation.user.full_name + '</div>';
            return;
        }

        container.innerHTML = messages.map(m => this.createHTML(m)).join('');
        container.scrollTop = container.scrollHeight;
    }

    createHTML(msg) {
        const isOwn = msg.sender_id === window.authManager.currentUser.id;
        const time = new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        const name = isOwn ? 
            (window.authManager.currentUser.full_name || window.authManager.currentUser.username) :
            (this.currentConversation.user.full_name || this.currentConversation.user.username);
        
        return '<div class="message ' + (isOwn ? 'own' : '') + '" data-message-id="' + msg.id + '">' +
               '<div class="message-avatar">' + name.charAt(0).toUpperCase() + '</div>' +
               '<div class="message-content">' +
               '<div class="message-text">' + this.escape(msg.text) + '</div>' +
               '<div class="message-time">' + time + '</div>' +
               '</div></div>';
    }

    escape(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    async sendInstant() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        if (!text || !this.currentConversation) return;

        // Clear input instantly
        input.value = '';

        // Create message object
        const msg = {
            id: 'temp-' + Date.now(),
            conversation_id: this.currentConversation.conversationId,
            sender_id: window.authManager.currentUser.id,
            text: text,
            created_at: new Date().toISOString()
        };

        // Add to UI instantly
        this.addToUI(msg);

        // Send to database (fire and forget for speed)
        window.supabase
            .from('messages')
            .insert({
                conversation_id: this.currentConversation.conversationId,
                sender_id: window.authManager.currentUser.id,
                text: text
            })
            .then(({ data, error }) => {
                if (!error && data) {
                    // Update temp message with real ID
                    const element = document.querySelector('[data-message-id="' + msg.id + '"]');
                    if (element) element.setAttribute('data-message-id', data[0].id);
                }
            });
    }

    addToUI(msg) {
        const container = document.getElementById('chatMessages');
        
        // Remove welcome message
        if (container.innerHTML.includes('Start chatting')) {
            container.innerHTML = '';
        }

        // Check for duplicates
        if (document.querySelector('[data-message-id="' + msg.id + '"]')) return;

        // Add message
        container.insertAdjacentHTML('beforeend', this.createHTML(msg));
        container.scrollTop = container.scrollHeight;
    }

    cleanup() {
        if (this.realtimeChannel) {
            this.realtimeChannel.unsubscribe();
        }
    }
}

// Replace chat manager
if (window.chatManager?.cleanup) window.chatManager.cleanup();
window.chatManager = new UltraFastChat();

// Initialize immediately
window.chatManager.initialize();

console.log('Ultra Fast Chat loaded');