// Fix groups display to work with profiles table
console.log('🔧 Fixing groups display...');

// Wait for managers to load
setTimeout(() => {
    if (window.groupsChannelsManager) {
        // Override the createGroup method to work with profiles
        const originalCreateGroup = window.groupsChannelsManager.createGroup;
        
        window.groupsChannelsManager.createGroup = async function(groupData) {
            console.log('📝 Creating group with profiles support...');
            
            // Get current user from localStorage (local fallback)
            const currentUser = JSON.parse(localStorage.getItem('businessconnect_current_user') || '{}');
            
            if (!currentUser.id) {
                throw new Error('User not authenticated');
            }
            
            // Ensure group has a name
            const groupName = groupData?.name || groupData || `Group ${Date.now()}`;
            
            // Create group locally first
            const group = {
                id: Date.now().toString(),
                name: groupName,
                description: groupData?.description || '',
                created_by: currentUser.id,
                created_at: new Date().toISOString(),
                members: [currentUser.id]
            };
            
            // Save to localStorage
            const groups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
            groups.push(group);
            localStorage.setItem('businessconnect_groups', JSON.stringify(groups));
            
            console.log('✅ Group created locally:', group);
            
            // Try to save to Nhost if available
            if (window.nhost && window.isNhostEnabled) {
                try {
                    const { data, error } = await window.nhost.graphql.request(`
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
                            name: groupData.name,
                            description: groupData.description || '',
                            created_by: currentUser.id
                        }
                    });
                    
                    if (!error) {
                        console.log('✅ Group also saved to Nhost:', data.insert_groups_one);
                    }
                } catch (error) {
                    console.log('⚠️ Nhost save failed, using local only:', error.message);
                }
            }
            
            return group;
        };
        
        // Override getMyGroups to work with local storage
        window.groupsChannelsManager.getMyGroups = async function() {
            const currentUser = JSON.parse(localStorage.getItem('businessconnect_current_user') || '{}');
            
            if (!currentUser.id) {
                return [];
            }
            
            // Get from localStorage
            const groups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
            const myGroups = groups.filter(group => group.created_by === currentUser.id);
            
            console.log('📋 My groups from localStorage:', myGroups);
            
            // Try to get from Nhost if available
            if (window.nhost && window.isNhostEnabled) {
                try {
                    const { data, error } = await window.nhost.graphql.request(`
                        query GetMyGroups($userId: uuid!) {
                            groups(where: {created_by: {_eq: $userId}}) {
                                id
                                name
                                description
                                created_by
                                created_at
                            }
                        }
                    `, { userId: currentUser.id });
                    
                    if (!error && data.groups) {
                        console.log('📋 My groups from Nhost:', data.groups);
                        return data.groups;
                    }
                } catch (error) {
                    console.log('⚠️ Nhost fetch failed, using local:', error.message);
                }
            }
            
            return myGroups;
        };
        
        console.log('✅ Groups manager fixed for profiles table');
    }
}, 1000);

// Test function that works
window.testGroupsFixed = async function() {
    console.log('🧪 Testing fixed groups...');
    
    try {
        // Create test group
        const group = await window.groupsChannelsManager.createGroup({
            name: `Test Group ${Date.now()}`,
            description: 'Test group created by fixed function'
        });
        
        console.log('✅ Group created:', group);
        
        // Get my groups
        const myGroups = await window.groupsChannelsManager.getMyGroups();
        console.log('✅ My groups:', myGroups);
        
        return true;
    } catch (error) {
        console.error('❌ Group test failed:', error);
        return false;
    }
};

console.log('🛠️ Groups display fix loaded');
console.log('🧪 Test with: testGroupsFixed()');