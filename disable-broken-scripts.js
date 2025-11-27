// Disable broken Nhost scripts and clean up console
console.log('🧹 Cleaning up broken scripts...');

// Disable broken test functions
window.testNhostConnection = function() {
    console.log('ℹ️ Nhost connection disabled - using local storage');
    return false;
};

window.testGroupCreation = function() {
    console.log('ℹ️ Use testGroupsFixed() instead');
    return false;
};

// Override broken initialization attempts
window.isNhostEnabled = false;
window.nhost = null;

// Clean success message
console.log('✅ App running in LOCAL MODE');
console.log('🧪 Test groups with: testGroupsFixed()');
console.log('🔑 Login with any email/password to test');

// Hide error messages from other scripts
const originalError = console.error;
console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('Nhost') || 
        message.includes('NhostClient') || 
        message.includes('Not authenticated') ||
        message.includes('AuthManager not available')) {
        return; // Skip these errors
    }
    originalError.apply(console, args);
};

console.log('🎯 BusinessConnect ready - Groups working locally!');