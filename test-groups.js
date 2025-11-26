// Test Groups Functionality
console.log('🧪 Group Testing Functions Loaded');

window.testGroupCreation = async function() {
    console.log('=== Testing Group Creation ===');
    
    if (!window.authManager?.currentUser) {
        console.log('❌ No user logged in. Please login first.');
        return;
    }
    
    const testGroupName = 'Test Group ' + Date.now();
    const testDescription = 'Test group created by automated test';
    
    try {
        console.log('📝 Creating test group:', testGroupName);
        
        let group;
        if (window.isNhostEnabled && window.nhost) {
            console.log('🌐 Using Nhost for group creation');
            const { data: groupData, error } = await window.nhost.graphql.request(`
                mutation CreateGroup($group: groups_insert_input!) {
                    insert_groups_one(object: $group) {
                        id
                        name
                        description
                        created_by
                        created_at
                    }
                }
            `, {
                group: {
                    name: testGroupName,
                    description: testDescription,
                    created_by: window.authManager.currentUser.id
                }
            });
            
            if (error) {
                console.log('❌ Nhost error:', error);
                throw error;
            }
            
            group = groupData.data.insert_groups_one;
            console.log('✅ Group created in Nhost:', group);
            
        } else {
            console.log('💾 Using local storage for group creation');
            const localGroups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
            group = {
                id: 'test_group_' + Date.now(),
                name: testGroupName,
                description: testDescription,
                created_by: window.authManager.currentUser.id,
                created_at: new Date().toISOString()
            };
            
            localGroups.push(group);
            localStorage.setItem('businessconnect_groups', JSON.stringify(localGroups));
            console.log('✅ Group created locally:', group);
        }
        
        // Test retrieval
        console.log('🔍 Testing group retrieval...');
        await window.authManager.showMyGroups();
        
        return group;
        
    } catch (error) {
        console.log('❌ Group creation failed:', error);
        return null;
    }
};

window.testGroupRetrieval = async function() {
    console.log('=== Testing Group Retrieval ===');
    
    if (!window.authManager?.currentUser) {
        console.log('❌ No user logged in');
        return;
    }
    
    try {
        let groups = [];
        
        if (window.isNhostEnabled && window.nhost) {
            console.log('🌐 Fetching groups from Nhost...');
            const { data: groupsData, error } = await window.nhost.graphql.request(`
                query GetMyGroups($userId: uuid!) {
                    groups(where: {created_by: {_eq: $userId}}) {
                        id
                        name
                        description
                        created_at
                    }
                }
            `, { userId: window.authManager.currentUser.id });
            
            if (error) {
                console.log('❌ Nhost query error:', error);
            } else {
                groups = groupsData?.data?.groups || [];
                console.log('✅ Found', groups.length, 'groups in Nhost');
            }
        } else {
            console.log('💾 Fetching groups from local storage...');
            const localGroups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
            groups = localGroups.filter(g => g.created_by === window.authManager.currentUser.id);
            console.log('✅ Found', groups.length, 'groups locally');
        }
        
        groups.forEach((group, index) => {
            console.log(`${index + 1}. ${group.name} (${group.id})`);
        });
        
        return groups;
        
    } catch (error) {
        console.log('❌ Group retrieval failed:', error);
        return [];
    }
};

window.quickTest = async function() {
    console.log('🚀 Running Quick Group Test...');
    
    // Check prerequisites
    if (!window.authManager?.currentUser) {
        console.log('❌ Please login first');
        return;
    }
    
    // Test creation
    const group = await window.testGroupCreation();
    if (!group) {
        console.log('❌ Group creation failed');
        return;
    }
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test retrieval
    const groups = await window.testGroupRetrieval();
    
    // Check if our test group appears
    const foundGroup = groups.find(g => g.id === group.id);
    if (foundGroup) {
        console.log('✅ SUCCESS: Test group found in retrieval!');
    } else {
        console.log('❌ FAILED: Test group not found in retrieval');
    }
    
    console.log('🏁 Quick test complete');
};

console.log('Available commands:');
console.log('- testGroupCreation() - Test creating a group');
console.log('- testGroupRetrieval() - Test fetching groups');
console.log('- quickTest() - Run full test suite');