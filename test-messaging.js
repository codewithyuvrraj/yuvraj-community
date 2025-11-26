// Test messaging functionality
console.log('=== Testing Messaging System ===');

// Test 1: Check if Supabase is available
console.log('1. Supabase available:', !!window.supabase);
console.log('2. isSupabaseEnabled:', window.isSupabaseEnabled);

// Test 2: Check if ChatManager is initialized
console.log('3. ChatManager exists:', !!window.chatManager);
console.log('4. ChatManager type:', typeof window.chatManager);

// Test 3: Test message sending function
window.testSendMessage = async function(text = 'Test message') {
    if (!window.authManager.currentUser) {
        console.error('No user logged in');
        return;
    }
    
    if (!window.chatManager.currentConversation) {
        console.error('No conversation active');
        return;
    }
    
    try {
        console.log('Sending test message:', text);
        
        const { data, error } = await window.supabase
            .rpc('send_message', {
                conv_id: window.chatManager.currentConversation.conversationId,
                message_text: text
            });
        
        if (error) {
            console.error('Send message error:', error);
        } else {
            console.log('Message sent successfully, ID:', data);
        }
    } catch (err) {
        console.error('Test send error:', err);
    }
};

// Test 4: Test direct database insert
window.testDirectInsert = async function() {
    if (!window.authManager.currentUser) {
        console.error('No user logged in');
        return;
    }
    
    if (!window.chatManager.currentConversation) {
        console.error('No conversation active');
        return;
    }
    
    try {
        const { data, error } = await window.supabase
            .from('messages')
            .insert({
                conversation_id: window.chatManager.currentConversation.conversationId,
                sender_id: window.authManager.currentUser.id,
                text: 'Direct insert test'
            })
            .select();
        
        if (error) {
            console.error('Direct insert error:', error);
        } else {
            console.log('Direct insert successful:', data);
        }
    } catch (err) {
        console.error('Direct insert failed:', err);
    }
};

console.log('Test functions available: testSendMessage(), testDirectInsert()');