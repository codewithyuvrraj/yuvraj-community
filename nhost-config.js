// Nhost Configuration for BusinessConnect
// Replace Supabase with Nhost backend

const NHOST_CONFIG = {
    subdomain: 'dvvouzofgfhzippzlnee',
    region: 'eu-central-1',
    
    // GraphQL endpoint
    graphqlUrl: `https://dvvouzofgfhzippzlnee.nhost.run/v1/graphql`,
    
    // Auth endpoint  
    authUrl: `https://dvvouzofgfhzippzlnee.nhost.run/v1/auth`,
    
    // Storage endpoint
    storageUrl: `https://dvvouzofgfhzippzlnee.nhost.run/v1/storage`,
    
    // Functions endpoint
    functionsUrl: `https://dvvouzofgfhzippzlnee.nhost.run/v1/functions`
};

// Initialize Nhost client
function initializeNhost() {
    try {
        const nhost = new window.NhostClient({
            subdomain: NHOST_CONFIG.subdomain,
            region: NHOST_CONFIG.region
        });
        
        console.log('✅ Nhost initialized successfully');
        return nhost;
    } catch (error) {
        console.error('❌ Nhost initialization failed:', error);
        return null;
    }
}

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NHOST_CONFIG, initializeNhost };
} else {
    window.NHOST_CONFIG = NHOST_CONFIG;
    window.initializeNhost = initializeNhost;
}