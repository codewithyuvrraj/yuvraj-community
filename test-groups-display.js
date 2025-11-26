// Test Groups Display Functionality
console.log('🧪 Testing Groups Display...');

async function testGroupsDisplay() {
    console.log('=== Testing Groups Display ===');
    
    // Wait for managers to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!window.authManager) {
        console.error('❌ AuthManager not found');
        return;
    }
    
    if (!window.groupsChannelsManager) {
        console.error('❌ GroupsChannelsManager not found');
        return;
    }
    
    console.log('✅ Managers loaded');
    
    // Test creating a group
    try {
        console.log('📝 Creating test group...');
        const testGroup = await window.groupsChannelsManager.createGroup('Test Group', 'A test group for demo');
        console.log('✅ Group created:', testGroup);
        
        // Test getting groups
        console.log('📋 Getting my groups...');
        const myGroups = await window.groupsChannelsManager.getMyGroups();
        console.log('✅ My groups:', myGroups);
        
        if (myGroups.length > 0) {
            console.log('🎉 Groups are being saved and retrieved correctly!');
        } else {
            console.log('⚠️ No groups found - check if creation is working');
        }
        
    } catch (error) {
        console.error('❌ Error testing groups:', error);
    }
}

// Auto-run test when page loads
window.addEventListener('load', () => {
    setTimeout(testGroupsDisplay, 3000);
});

// Make test available globally
window.testGroupsDisplay = testGroupsDisplay;

console.log('🔧 Groups display test loaded. Run testGroupsDisplay() to test manually.');