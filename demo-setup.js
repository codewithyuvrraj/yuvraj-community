// Demo Setup - Create test user and data
console.log('🎭 Demo Setup Loading...');

window.setupDemo = function() {
    console.log('🚀 Setting up demo data...');
    
    // Create demo user
    const demoUser = {
        id: 'demo_user_123',
        username: 'demo',
        email: 'demo@example.com',
        password: 'demo123',
        full_name: 'Demo User',
        avatar_url: null,
        bio: 'Demo user for testing BusinessConnect',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    // Add to users list
    const users = JSON.parse(localStorage.getItem('businessconnect_users') || '[]');
    const existingUser = users.find(u => u.email === demoUser.email);
    if (!existingUser) {
        users.push(demoUser);
        localStorage.setItem('businessconnect_users', JSON.stringify(users));
        console.log('✅ Demo user created');
    } else {
        console.log('ℹ️ Demo user already exists');
    }
    
    // Create demo groups
    const demoGroups = [
        {
            id: 'demo_group_1',
            name: 'Business Network',
            description: 'Professional networking group',
            photo_url: null,
            created_by: demoUser.id,
            created_at: new Date().toISOString()
        },
        {
            id: 'demo_group_2', 
            name: 'Tech Discussions',
            description: 'Technology and innovation talks',
            photo_url: null,
            created_by: demoUser.id,
            created_at: new Date().toISOString()
        }
    ];
    
    const groups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
    demoGroups.forEach(group => {
        if (!groups.find(g => g.id === group.id)) {
            groups.push(group);
            // Add demo user as member
            localStorage.setItem(`group_members_${group.id}`, JSON.stringify([demoUser.id]));
        }
    });
    localStorage.setItem('businessconnect_groups', JSON.stringify(groups));
    console.log('✅ Demo groups created');
    
    console.log('🎉 Demo setup complete!');
    console.log('📝 Demo credentials:');
    console.log('   Email: demo@example.com');
    console.log('   Password: demo123');
};

window.loginDemo = function() {
    console.log('🔑 Logging in demo user...');
    
    const demoUser = {
        id: 'demo_user_123',
        username: 'demo',
        email: 'demo@example.com',
        full_name: 'Demo User',
        avatar_url: null,
        bio: 'Demo user for testing BusinessConnect',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    // Set as current user
    localStorage.setItem('businessconnect_current_user', JSON.stringify(demoUser));
    
    // Update auth manager
    if (window.authManager) {
        window.authManager.currentUser = demoUser;
        window.authManager.showApp();
        console.log('✅ Demo user logged in');
    } else {
        console.log('❌ AuthManager not available');
    }
};

// Auto-setup demo data
window.setupDemo();

console.log('Available commands:');
console.log('- setupDemo() - Create demo data');
console.log('- loginDemo() - Login as demo user');