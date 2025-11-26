// Test script to verify fixes
console.log('🔍 Testing BusinessConnect fixes...');
console.log('Available commands:');
console.log('- testFixes() - Run all tests');
console.log('- checkNhostStatus() - Check Nhost connection');
console.log('- clearLocalData() - Clear local storage');

// Test 1: Check if Nhost is properly initialized
function testNhostConnection() {
    console.log('1. Testing Nhost connection...');
    
    // Check if SDK is loaded
    if (typeof window.NhostClient === 'undefined') {
        console.log('❌ Nhost SDK not loaded - check script tag');
        return false;
    }
    
    if (window.nhost && window.isNhostEnabled) {
        console.log('✅ Nhost is initialized and enabled');
        console.log('   Subdomain:', window.NHOST_SUBDOMAIN);
        console.log('   Region:', window.NHOST_REGION);
        return true;
    } else {
        console.log('❌ Nhost not available');
        console.log('   SDK loaded:', typeof window.NhostClient !== 'undefined');
        console.log('   Instance exists:', !!window.nhost);
        console.log('   Enabled flag:', window.isNhostEnabled);
        return false;
    }
}

// Test 2: Check user registration
async function testUserRegistration() {
    console.log('2. Testing user registration...');
    if (!window.authManager) {
        console.log('❌ AuthManager not available');
        return false;
    }
    
    const currentUser = window.authManager.getCurrentUser();
    if (currentUser) {
        console.log('✅ User is logged in:', currentUser.full_name || currentUser.username);
        console.log('   User ID:', currentUser.id);
        console.log('   Email:', currentUser.email);
        
        // Test Nhost session if available
        if (window.isNhostEnabled && window.nhost) {
            try {
                const nhostUser = await window.nhost.auth.getUser();
                if (nhostUser) {
                    console.log('✅ Nhost session active for:', nhostUser.email);
                } else {
                    console.log('⚠️ Local user but no Nhost session');
                }
            } catch (error) {
                console.log('⚠️ Nhost session check failed:', error.message);
            }
        }
        return true;
    } else {
        console.log('❌ No user logged in');
        console.log('   Try: Register a new account or login');
        return false;
    }
}

// Test 3: Check group creation functionality
async function testGroupCreation() {
    console.log('3. Testing group creation...');
    if (!window.groupChatManager) {
        console.log('❌ GroupChatManager not available');
        return false;
    }
    
    try {
        // This would normally create a group, but we'll just check if the function exists
        if (typeof window.groupChatManager.createGroup === 'function') {
            console.log('✅ Group creation function available');
            return true;
        } else {
            console.log('❌ Group creation function not found');
            return false;
        }
    } catch (error) {
        console.log('❌ Error testing group creation:', error.message);
        return false;
    }
}

// Test 4: Check if groups can be retrieved
async function testGroupRetrieval() {
    console.log('4. Testing group retrieval...');
    if (!window.authManager) {
        console.log('❌ AuthManager not available');
        return false;
    }
    
    try {
        // Check if the function exists
        if (typeof window.authManager.showMyGroups === 'function') {
            console.log('✅ Group retrieval function available');
            return true;
        } else {
            console.log('❌ Group retrieval function not found');
            return false;
        }
    } catch (error) {
        console.log('❌ Error testing group retrieval:', error.message);
        return false;
    }
}

// Run all tests
async function runTests() {
    console.log('=== BusinessConnect Fix Tests ===');
    
    const results = {
        nhost: testNhostConnection(),
        user: await testUserRegistration(),
        groupCreation: await testGroupCreation(),
        groupRetrieval: await testGroupRetrieval()
    };
    
    console.log('\n=== Test Results ===');
    console.log('Nhost Connection:', results.nhost ? '✅' : '❌');
    console.log('User Registration:', results.user ? '✅' : '❌');
    console.log('Group Creation:', results.groupCreation ? '✅' : '❌');
    console.log('Group Retrieval:', results.groupRetrieval ? '✅' : '❌');
    
    const allPassed = Object.values(results).every(result => result);
    console.log('\nOverall Status:', allPassed ? '✅ All tests passed' : '❌ Some tests failed');
    
    if (!allPassed) {
        console.log('\n🔧 Troubleshooting:');
        if (!results.nhost) {
            console.log('- Nhost Issues:');
            console.log('  * Check if Nhost SDK script is loaded');
            console.log('  * Verify subdomain and region in config');
            console.log('  * Check network connection to Nhost');
        }
        if (!results.user) {
            console.log('- User Issues:');
            console.log('  * Try registering a new account');
            console.log('  * Check browser console for auth errors');
            console.log('  * Clear localStorage and try again');
        }
        if (!results.groupCreation) console.log('- Check if group-chat.js is loaded');
        if (!results.groupRetrieval) console.log('- Check if index.html has the latest fixes');
        
        console.log('\n🚀 Quick Fixes:');
        console.log('- Refresh the page');
        console.log('- Clear browser cache and localStorage');
        console.log('- Check browser network tab for failed requests');
    }
}

// Auto-run tests when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runTests);
} else {
    runTests();
}

// Make available globally for manual testing
window.testFixes = runTests;

// Add helper functions
window.clearLocalData = function() {
    localStorage.clear();
    console.log('✅ Local storage cleared. Refresh the page.');
};

window.checkNhostStatus = function() {
    console.log('=== Nhost Status Check ===');
    console.log('SDK Loaded:', typeof window.NhostClient !== 'undefined');
    console.log('Instance:', !!window.nhost);
    console.log('Enabled:', window.isNhostEnabled);
    console.log('Config:', { subdomain: window.NHOST_SUBDOMAIN, region: window.NHOST_REGION });
    
    if (window.nhost) {
        window.nhost.auth.getUser().then(user => {
            console.log('Current User:', user ? user.email : 'None');
        }).catch(err => {
            console.log('Auth Error:', err.message);
        });
    }
};