// Script to update app to use 'profiles' instead of 'users'
console.log('🔄 Updating app to use profiles table...');

// Function to update all GraphQL queries in the app
function updateToProfiles() {
    // Update test functions
    if (window.testNhostConnection) {
        window.testNhostConnection = async function() {
            console.log('\n=== NHOST CONNECTION TEST ===');
            
            try {
                if (!window.nhost) {
                    console.error('❌ Nhost not initialized');
                    return false;
                }
                
                console.log('✅ Nhost client available');
                
                // Test GraphQL connection with profiles
                const { data, error } = await window.nhost.graphql.request(`
                    query TestConnection {
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
                
                console.log('✅ GraphQL connection successful');
                console.log('📊 Total profiles in database:', data.profiles_aggregate.aggregate.count);
                
                return true;
            } catch (error) {
                console.error('❌ Connection test failed:', error);
                return false;
            }
        };
    }

    // Update user creation test
    if (window.testUserCreation) {
        window.testUserCreation = async function() {
            console.log('\n=== PROFILE CREATION TEST ===');
            
            if (!window.nhost) {
                console.error('❌ Nhost not available');
                return false;
            }
            
            try {
                const testEmail = `test_${Date.now()}@example.com`;
                const testUsername = `test_${Date.now()}`;
                
                console.log('🔄 Creating test profile...');
                
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
                
                // Create user profile in profiles table
                const { data: userData, error: userError } = await window.nhost.graphql.request(`
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
                        username: testUsername,
                        full_name: 'Test User',
                        email: testEmail,
                        bio: 'Test profile created by connection test'
                    }
                });
                
                if (userError) {
                    console.error('❌ Profile Creation Error:', userError);
                    return false;
                }
                
                console.log('✅ Profile created:', userData.insert_profiles_one);
                
                // Clean up - delete test user
                await window.nhost.auth.signOut();
                
                return true;
            } catch (error) {
                console.error('❌ Profile creation test failed:', error);
                return false;
            }
        };
    }

    console.log('✅ App updated to use profiles table');
    console.log('🧪 Test with: testNhostConnection()');
}

// Auto-update when script loads
updateToProfiles();

// Export for manual use
window.updateToProfiles = updateToProfiles;