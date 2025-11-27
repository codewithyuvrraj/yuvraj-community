// Fix Nhost connection and groups display
console.log('🔧 Fixing Nhost connection and groups...');

// Alternative Nhost initialization
function initializeNhostAlternative() {
    if (typeof NhostClient === 'undefined') {
        console.log('⚠️ NhostClient not found, loading alternative...');
        
        // Load Nhost SDK dynamically
        const script = document.createElement('script');
        script.src = 'https://cdn.skypack.dev/@nhost/nhost-js@2.2.16';
        script.onload = function() {
            console.log('📦 Nhost SDK loaded via Skypack');
            setupNhost();
        };
        script.onerror = function() {
            console.log('❌ Failed to load Nhost SDK, using local fallback');
            window.isNhostEnabled = false;
        };
        document.head.appendChild(script);
    } else {
        setupNhost();
    }
}

function setupNhost() {
    try {
        window.nhost = new NhostClient({
            subdomain: 'dvvouzofgfhzippzlnee',
            region: 'eu-central-1'
        });
        window.isNhostEnabled = true;
        console.log('✅ Nhost initialized successfully');
        
        // Test connection
        testNhostConnection();
    } catch (error) {
        console.error('❌ Nhost setup failed:', error);
        window.isNhostEnabled = false;
    }
}

// Enhanced test function
window.testNhostConnection = async function() {
    console.log('\n=== ENHANCED NHOST TEST ===');
    
    if (!window.nhost) {
        console.error('❌ Nhost not initialized');
        return false;
    }
    
    try {
        // Test with profiles table
        const { data, error } = await window.nhost.graphql.request(`
            query TestProfiles {
                profiles_aggregate {
                    aggregate {
                        count
                    }
                }
            }
        `);
        
        if (error) {
            console.error('❌ GraphQL Error:', error);
            return false;
        }
        
        console.log('✅ Profiles connection successful');
        console.log('📊 Total profiles:', data.profiles_aggregate.aggregate.count);
        
        // Test groups
        const { data: groupsData, error: groupsError } = await window.nhost.graphql.request(`
            query TestGroups {
                groups_aggregate {
                    aggregate {
                        count
                    }
                }
            }
        `);
        
        if (!groupsError) {
            console.log('✅ Groups connection successful');
            console.log('📊 Total groups:', groupsData.groups_aggregate.aggregate.count);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Connection test failed:', error);
        return false;
    }
};

// Test group creation with profiles
window.testGroupCreationFixed = async function() {
    console.log('\n=== FIXED GROUP CREATION TEST ===');
    
    if (!window.nhost) {
        console.error('❌ Nhost not available');
        return false;
    }
    
    // First create a test profile
    try {
        const testEmail = `grouptest_${Date.now()}@example.com`;
        
        // Create auth user
        const { session, error: authError } = await window.nhost.auth.signUp({
            email: testEmail,
            password: 'test123456'
        });
        
        if (authError) {
            console.error('❌ Auth Error:', authError);
            return false;
        }
        
        // Create profile
        const { data: profileData, error: profileError } = await window.nhost.graphql.request(`
            mutation CreateTestProfile($profile: profiles_insert_input!) {
                insert_profiles_one(object: $profile) {
                    id
                    username
                    full_name
                    email
                }
            }
        `, {
            profile: {
                id: session.user.id,
                username: `grouptest_${Date.now()}`,
                full_name: 'Group Test User',
                email: testEmail
            }
        });
        
        if (profileError) {
            console.error('❌ Profile Error:', profileError);
            return false;
        }
        
        console.log('✅ Test profile created:', profileData.insert_profiles_one);
        
        // Create group
        const { data: groupData, error: groupError } = await window.nhost.graphql.request(`
            mutation CreateTestGroup($group: groups_insert_input!) {
                insert_groups_one(object: $group) {
                    id
                    name
                    created_by
                    created_at
                }
            }
        `, {
            group: {
                name: `Test Group ${Date.now()}`,
                description: 'Test group created by fixed test',
                created_by: session.user.id
            }
        });
        
        if (groupError) {
            console.error('❌ Group Creation Error:', groupError);
            return false;
        }
        
        console.log('✅ Group created successfully:', groupData.insert_groups_one);
        
        // Clean up
        await window.nhost.auth.signOut();
        
        return true;
    } catch (error) {
        console.error('❌ Group creation test failed:', error);
        return false;
    }
};

// Auto-initialize when script loads
setTimeout(() => {
    if (!window.nhost || !window.isNhostEnabled) {
        console.log('🔄 Attempting alternative Nhost initialization...');
        initializeNhostAlternative();
    }
}, 2000);

console.log('🛠️ Nhost fix script loaded');
console.log('🧪 Available commands:');
console.log('- testNhostConnection() - Test connection');
console.log('- testGroupCreationFixed() - Test group creation with profiles');