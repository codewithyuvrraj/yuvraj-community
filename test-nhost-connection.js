// Test Nhost Connection and Database Setup
console.log('🔍 Testing Nhost Connection...');

// Test functions
window.testNhostConnection = async function() {
    console.log('\n=== NHOST CONNECTION TEST ===');
    
    try {
        // Check if Nhost is available
        if (!window.nhost) {
            console.error('❌ Nhost not initialized');
            return false;
        }
        
        console.log('✅ Nhost client available');
        
        // Test GraphQL connection
        const { data, error } = await window.nhost.graphql.request(`
            query TestConnection {
                users_aggregate {
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
        
        console.log('✅ GraphQL connection successful');
        console.log('📊 Total users in database:', data.users_aggregate.aggregate.count);
        
        return true;
    } catch (error) {
        console.error('❌ Connection test failed:', error);
        return false;
    }
};

window.testUserCreation = async function() {
    console.log('\n=== USER CREATION TEST ===');
    
    if (!window.nhost) {
        console.error('❌ Nhost not available');
        return false;
    }
    
    try {
        // Test creating a user
        const testEmail = `test_${Date.now()}@example.com`;
        const testUsername = `test_${Date.now()}`;
        
        console.log('🔄 Creating test user...');
        
        const { session, error: authError } = await window.nhost.auth.signUp({
            email: testEmail,
            password: 'test123456',
            options: {
                displayName: 'Test User',
                allowedRoles: ['user'],
                defaultRole: 'user'
            }
        });
        
        if (authError) {
            console.error('❌ Auth Error:', authError);
            return false;
        }
        
        if (!session || !session.user) {
            console.error('❌ No session created');
            return false;
        }
        
        console.log('✅ Auth user created:', session.user.id);
        
        // Create user profile
        const { data: userData, error: userError } = await window.nhost.graphql.request(`
            mutation CreateTestUser($user: users_insert_input!) {
                insert_users_one(object: $user) {
                    id
                    username
                    full_name
                    email
                }
            }
        `, {
            user: {
                id: session.user.id,
                username: testUsername,
                full_name: 'Test User',
                email: testEmail,
                bio: 'Test user created by connection test'
            }
        });
        
        if (userError) {
            console.error('❌ User Profile Error:', userError);
            return false;
        }
        
        console.log('✅ User profile created:', userData.insert_users_one);
        
        // Clean up - delete test user
        await window.nhost.auth.signOut();
        
        return true;
    } catch (error) {
        console.error('❌ User creation test failed:', error);
        return false;
    }
};

window.testGroupCreation = async function() {
    console.log('\n=== GROUP CREATION TEST ===');
    
    if (!window.nhost || !window.nhost.auth.getUser()) {
        console.error('❌ Not authenticated');
        return false;
    }
    
    try {
        const user = window.nhost.auth.getUser();
        const testGroupName = `Test Group ${Date.now()}`;
        
        console.log('🔄 Creating test group...');
        
        const { data, error } = await window.nhost.graphql.request(`
            mutation CreateTestGroup($group: groups_insert_input!) {
                insert_groups_one(object: $group) {
                    id
                    name
                    created_by
                }
            }
        `, {
            group: {
                name: testGroupName,
                description: 'Test group created by connection test',
                created_by: user.id
            }
        });
        
        if (error) {
            console.error('❌ Group Creation Error:', error);
            return false;
        }
        
        console.log('✅ Group created:', data.insert_groups_one);
        
        return true;
    } catch (error) {
        console.error('❌ Group creation test failed:', error);
        return false;
    }
};

window.runAllTests = async function() {
    console.log('🚀 Running all Nhost tests...\n');
    
    const connectionTest = await window.testNhostConnection();
    const userTest = await window.testUserCreation();
    const groupTest = await window.testGroupCreation();
    
    console.log('\n=== TEST RESULTS ===');
    console.log('Connection Test:', connectionTest ? '✅ PASS' : '❌ FAIL');
    console.log('User Creation Test:', userTest ? '✅ PASS' : '❌ FAIL');
    console.log('Group Creation Test:', groupTest ? '✅ PASS' : '❌ FAIL');
    
    const allPassed = connectionTest && userTest && groupTest;
    console.log('\nOverall Result:', allPassed ? '🎉 ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED');
    
    if (!allPassed) {
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Make sure you have applied the complete schema: nhost_complete_schema.sql');
        console.log('2. Check Nhost subdomain and region in index.html');
        console.log('3. Verify Hasura permissions are set up correctly');
        console.log('4. Check browser network tab for failed requests');
    }
    
    return allPassed;
};

// Auto-run basic connection test when script loads
setTimeout(() => {
    if (window.nhost) {
        window.testNhostConnection();
    } else {
        console.log('⏳ Waiting for Nhost to initialize...');
        setTimeout(() => {
            if (window.nhost) {
                window.testNhostConnection();
            } else {
                console.log('❌ Nhost failed to initialize after 2 seconds');
            }
        }, 2000);
    }
}, 1000);

console.log('🧪 Nhost test functions loaded:');
console.log('- testNhostConnection() - Test basic connection');
console.log('- testUserCreation() - Test user signup and profile creation');
console.log('- testGroupCreation() - Test group creation (requires login)');
console.log('- runAllTests() - Run all tests');