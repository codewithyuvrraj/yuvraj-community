// Show groups in the UI
console.log('🎨 Setting up groups UI display...');

// Function to display groups in the home feed
function displayGroupsInUI() {
    const homeFeed = document.getElementById('homeFeed');
    if (!homeFeed) return;
    
    // Get current user
    const currentUser = JSON.parse(localStorage.getItem('businessconnect_current_user') || '{}');
    if (!currentUser.id) return;
    
    // Get groups from localStorage
    const groups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
    const myGroups = groups.filter(group => group.created_by === currentUser.id);
    
    if (myGroups.length === 0) {
        homeFeed.innerHTML = `
            <div class="feed-header">
                <h2><i class="fas fa-briefcase"></i> Welcome, ${currentUser.full_name || currentUser.username}</h2>
                <p>Your professional dashboard</p>
            </div>
            <div class="business-card">
                <h3><i class="fas fa-users"></i> Create Your First Group</h3>
                <p>Start building your professional network with group conversations</p>
                <button class="btn" style="background: rgba(255,255,255,0.2); color: white; margin-top: 12px;" onclick="createTestGroup()">
                    <i class="fas fa-plus"></i> Create Group
                </button>
            </div>
        `;
        return;
    }
    
    // Display groups
    homeFeed.innerHTML = `
        <div class="feed-header">
            <h2><i class="fas fa-users"></i> My Groups (${myGroups.length})</h2>
            <p>Manage your professional groups</p>
            <button class="btn btn-primary" onclick="createTestGroup()" style="margin-top: 12px;">
                <i class="fas fa-plus"></i> Create New Group
            </button>
        </div>
        ${myGroups.map(group => `
            <div class="followed-user" style="cursor: pointer;" onclick="openGroup('${group.id}')">
                <div class="followed-user-avatar" style="background: linear-gradient(135deg, #10b981, #059669);">
                    <i class="fas fa-users"></i>
                </div>
                <div class="followed-user-info">
                    <div class="followed-user-name">${group.name}</div>
                    <div class="followed-user-status">
                        <i class="fas fa-circle" style="color: #10b981;"></i> 
                        ${group.members?.length || 1} member${(group.members?.length || 1) !== 1 ? 's' : ''}
                    </div>
                    ${group.description ? `<div class="followed-user-bio">${group.description}</div>` : ''}
                    <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
                        Created ${new Date(group.created_at).toLocaleDateString()}
                    </div>
                </div>
                <div class="action-buttons">
                    <button class="message-btn" onclick="event.stopPropagation(); openGroupChat('${group.id}')">
                        <i class="fas fa-comment"></i> Open Chat
                    </button>
                    <button class="profile-btn" onclick="event.stopPropagation(); deleteGroup('${group.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('')}
    `;
}

// Function to create a test group
window.createTestGroup = async function() {
    try {
        const groupName = prompt('Enter group name:') || `My Group ${Date.now()}`;
        const groupDescription = prompt('Enter group description (optional):') || '';
        
        const group = await window.groupsChannelsManager.createGroup({
            name: groupName,
            description: groupDescription
        });
        
        console.log('✅ Group created:', group);
        
        // Refresh UI
        displayGroupsInUI();
        
        alert(`Group "${group.name}" created successfully!`);
    } catch (error) {
        console.error('❌ Failed to create group:', error);
        alert('Failed to create group: ' + error.message);
    }
};

// Function to open group
window.openGroup = function(groupId) {
    const groups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
    const group = groups.find(g => g.id === groupId);
    if (group) {
        alert(`Opening group: ${group.name}\n\nMembers: ${group.members?.length || 1}\nDescription: ${group.description || 'No description'}`);
    }
};

// Function to open group chat
window.openGroupChat = function(groupId) {
    const groups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
    const group = groups.find(g => g.id === groupId);
    if (group) {
        alert(`Group chat for: ${group.name}\n\n(Chat functionality will be implemented here)`);
    }
};

// Function to delete group
window.deleteGroup = function(groupId) {
    if (confirm('Are you sure you want to delete this group?')) {
        let groups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
        groups = groups.filter(g => g.id !== groupId);
        localStorage.setItem('businessconnect_groups', JSON.stringify(groups));
        
        // Refresh UI
        displayGroupsInUI();
        
        alert('Group deleted successfully!');
    }
};

// Don't auto-display groups in home feed
// Groups will be shown when groups button is clicked

// Listen for login events
window.addEventListener('storage', (e) => {
    if (e.key === 'businessconnect_current_user' || e.key === 'businessconnect_groups') {
        displayGroupsInUI();
    }
});

console.log('🎨 Groups UI display ready!');
console.log('🧪 Test with: createTestGroup()');