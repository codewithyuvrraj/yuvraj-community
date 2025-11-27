// Simple Nhost Fix - Load SDK properly
console.log('🔧 Simple Nhost Fix Loading...');

// Function to load Nhost SDK
function loadNhostSDK() {
    return new Promise((resolve, reject) => {
        // Remove existing script if any
        const existingScript = document.querySelector('script[src*="nhost"]');
        if (existingScript) {
            existingScript.remove();
        }
        
        // Load fresh Nhost SDK
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@nhost/nhost-js@1.13.14/dist/index.umd.js';
        script.onload = () => {
            console.log('✅ Nhost SDK loaded successfully');
            resolve();
        };
        script.onerror = () => {
            console.error('❌ Failed to load Nhost SDK');
            reject();
        };
        document.head.appendChild(script);
    });
}

// Initialize Nhost after SDK loads
async function initializeNhost() {
    try {
        await loadNhostSDK();
        
        // Wait a bit for SDK to be ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (typeof NhostClient !== 'undefined') {
            window.nhost = new NhostClient({
                subdomain: 'dvvouzofgfhzippzlnee',
                region: 'eu-central-1'
            });
            window.isNhostEnabled = true;
            console.log('✅ Nhost initialized successfully');
            
            // Test connection
            testConnection();
        } else {
            throw new Error('NhostClient still not available');
        }
    } catch (error) {
        console.error('❌ Nhost initialization failed:', error);
        window.isNhostEnabled = false;
    }
}

// Simple connection test
async function testConnection() {
    if (!window.nhost) return;
    
    try {
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
            console.error('❌ GraphQL test failed:', error);
        } else {
            console.log('✅ Nhost connection working! Profiles:', data.profiles_aggregate.aggregate.count);
        }
    } catch (error) {
        console.error('❌ Connection test failed:', error);
    }
}

// Override the broken test functions
window.testNhostConnection = testConnection;

// Start initialization
initializeNhost();

console.log('🛠️ Simple Nhost fix loaded');