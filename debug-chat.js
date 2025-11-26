// Debug script for ChatManager
console.log('=== ChatManager Debug ===');
console.log('window.chatManager exists:', !!window.chatManager);
console.log('window.supabase exists:', !!window.supabase);
console.log('window.isSupabaseEnabled:', window.isSupabaseEnabled);

if (window.chatManager) {
    console.log('ChatManager isInitialized:', window.chatManager.isInitialized);
    console.log('ChatManager supabase:', !!window.chatManager.supabase);
    console.log('ChatManager isSupabaseEnabled:', window.chatManager.isSupabaseEnabled);
}

// Test message sending
window.testMessage = async function() {
    if (!window.chatManager) {
        console.error('ChatManager not found');
        return;
    }
    
    if (!window.authManager || !window.authManager.currentUser) {
        console.error('No current user');
        return;
    }
    
    console.log('Testing message send...');
    
    // Mock conversation for testing
    window.chatManager.currentConversation = {
        userId: 'test-user',
        user: { id: 'test-user', full_name: 'Test User', username: 'testuser' },
        conversationId: 'test_conversation'
    };
    
    try {
        const message = {
            id: Date.now().toString(),
            conversation_id: 'test_conversation',
            sender_id: window.authManager.currentUser.id,
            text: 'Test message',
            timestamp: new Date().toISOString(),
            type: 'text'
        };
        
        console.log('Attempting to insert message:', message);
        
        if (window.chatManager.isSupabaseEnabled && window.chatManager.supabase) {
            const { error } = await window.chatManager.supabase
                .from('messages')
                .insert(message);
            
            if (error) {
                console.error('Supabase error:', error);
            } else {
                console.log('✅ Message sent successfully');
            }
        } else {
            console.error('Supabase not available');
        }
    } catch (error) {
        console.error('Test message error:', error);
    }
};

console.log('Run window.testMessage() to test message sending');