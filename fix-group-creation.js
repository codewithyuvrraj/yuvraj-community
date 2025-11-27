// Fix group creation and display
console.log('🔧 Fixing group creation...');

        
        if (!groupName) {
            alert('Group name is required');
            return;
        }
        
        // Get current user
        const currentUser = JSON.parse(localStorage.getItem('businessconnect_current_user') || '{}');
        if (!currentUser.id) {
            alert('Please login first');
            return;
        }
        
        // Create group directly
        const group = {
            id: Date.now().toString(),
            name: groupName,
            description: groupDescription,
            created_by: currentUser.id,
            created_at: new Date().toISOString(),
            members: [currentUser.id]
        };
        
        // Save to localStorage
        const groups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
        groups.push(group);
        localStorage.setItem('businessconnect_groups', JSON.stringify(groups));
        
        console.log('✅ Group created:', group);
        
        // Close any open modals and refresh
        document.querySelectorAll('.overlay').forEach(modal => modal.remove());
        
        // Show success and reopen groups modal
        alert(`Group "${group.name}" created successfully!`);
        
        // Reopen groups modal to show the new group
        setTimeout(() => {
            if (window.authManager && window.authManager.showMyGroups) {
                window.authManager.showMyGroups();
            }
        }, 100);
        
        return group;
    } catch (error) {
        console.error('❌ Failed to create group:', error);
        alert('Failed to create group: ' + error.message);
    }
};

// Fix the groups display function
window.showMyGroupsFixed = function() {
    const currentUser = JSON.parse(localStorage.getItem('businessconnect_current_user') || '{}');
    if (!currentUser.id) {
        alert('Please login first');
        return;
    }
    
    // Get groups from localStorage
    const groups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
    const myGroups = groups.filter(group => group.created_by === currentUser.id);
    
    console.log('📋 My groups:', myGroups);
    
    // Remove existing modal
    document.querySelectorAll('.overlay').forEach(modal => modal.remove());
    
    // Create new modal
    const modal = document.createElement('div');
    modal.className = 'overlay';
    modal.innerHTML = `
        <div class="settings-modal" style="max-width: 500px; max-height: 90vh;">
            <div class="settings-header" style="background: #10b981; color: white;">
                <h3><i class="fas fa-users"></i> My Groups (${myGroups.length})</h3>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="btn btn-icon" onclick="createTestGroup()" style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 8px; border-radius: 50%;" title="Create Group">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="close-btn" onclick="this.closest('.overlay').remove()" style="color: white;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="settings-content" style="max-height: 70vh; overflow-y: auto; padding: 20px;">
                ${myGroups.length === 0 ? `
                    <div style="text-align: center; padding: 40px 20px; color: #6b7280;">
                        <i class="fas fa-users" style="font-size: 48px; margin-bottom: 16px; color: #10b981;"></i>
                        <h3>No Groups Yet</h3>
                        <p>Create your first group to start collaborating</p>
                        <button class="btn" style="background: #10b981; color: white; margin-top: 16px;" onclick="createTestGroup()">
                            <i class="fas fa-plus"></i> Create Group
                        </button>
                    </div>
                ` : myGroups.map(group => `
                    <div style="display: flex; align-items: center; gap: 16px; padding: 16px; background: #f0fdf4; border-radius: 12px; margin-bottom: 12px; border-left: 4px solid #10b981;">
                        <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 18px;">
                            ${group.name.charAt(0).toUpperCase()}
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 600; font-size: 16px; color: #1f2937; margin-bottom: 4px;">${group.name}</div>
                            <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">
                                <i class="fas fa-users" style="margin-right: 4px;"></i>
                                ${group.members?.length || 1} member${(group.members?.length || 1) !== 1 ? 's' : ''}
                            </div>
                            ${group.description ? `<div style="color: #4b5563; font-size: 12px; margin-bottom: 4px;">${group.description}</div>` : ''}
                            <div style="color: #9ca3af; font-size: 11px;">
                                Created ${new Date(group.created_at).toLocaleDateString()}
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <button onclick="alert('Chat for ${group.name}')" style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                                <i class="fas fa-comment"></i> Chat
                            </button>
                            <button onclick="deleteGroupFixed('${group.id}')" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
};

// Fix delete function
window.deleteGroupFixed = function(groupId) {
    if (confirm('Are you sure you want to delete this group?')) {
        let groups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
        const groupName = groups.find(g => g.id === groupId)?.name || 'Unknown';
        groups = groups.filter(g => g.id !== groupId);
        localStorage.setItem('businessconnect_groups', JSON.stringify(groups));
        
        console.log('🗑️ Group deleted:', groupName);
        
        // Refresh the modal
        showMyGroupsFixed();
        
        alert(`Group "${groupName}" deleted successfully!`);
    }
};

// Override the groups button handlers
setTimeout(() => {
    // Override authManager function
    if (window.authManager) {
        window.authManager.showMyGroups = showMyGroupsFixed;
    }
    
    // Override button clicks
    const groupsBtn = document.getElementById('groupsBtn');
    if (groupsBtn) {
        groupsBtn.onclick = showMyGroupsFixed;
    }
    
    // Override influencer button
    const influencerBtns = document.querySelectorAll('[onclick*="showMyGroups"]');
    influencerBtns.forEach(btn => {
        btn.onclick = showMyGroupsFixed;
    });
}, 1000);

console.log('✅ Group creation and display fixed!');
console.log('🧪 Test: Click Groups button or run showMyGroupsFixed()');