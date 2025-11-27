// Handle groups button click to show groups
console.log('🔘 Setting up groups button handler...');

// Function to show groups when groups button is clicked
function showMyGroupsInModal() {
    const currentUser = JSON.parse(localStorage.getItem('businessconnect_current_user') || '{}');
    if (!currentUser.id) {
        alert('Please login first');
        return;
    }
    
    // Get groups from localStorage
    const groups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
    const myGroups = groups.filter(group => group.created_by === currentUser.id);
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'overlay';
    modal.innerHTML = `
        <div class="settings-modal" style="max-width: 500px; max-height: 90vh;">
            <div class="settings-header" style="background: #10b981; color: white;">
                <h3><i class="fas fa-users"></i> My Groups (${myGroups.length})</h3>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="btn btn-icon" onclick="createTestGroup(); this.closest('.overlay').remove();" style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 8px; border-radius: 50%;" title="Create Group">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="close-btn" onclick="this.closest('.overlay').remove()" style="color: white;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="settings-content" style="max-height: 70vh; overflow-y: auto;">
                ${myGroups.length === 0 ? `
                    <div style="text-align: center; padding: 40px 20px; color: #6b7280;">
                        <i class="fas fa-users" style="font-size: 48px; margin-bottom: 16px;"></i>
                        <h3>No Groups Yet</h3>
                        <p>Create your first group to start collaborating</p>
                        <button class="btn" style="background: #10b981; color: white; margin-top: 16px;" onclick="createTestGroup(); this.closest('.overlay').remove();">
                            <i class="fas fa-plus"></i> Create Group
                        </button>
                    </div>
                ` : myGroups.map(group => `
                    <div style="display: flex; align-items: center; gap: 16px; padding: 16px; background: #f0fdf4; border-radius: 12px; margin-bottom: 12px; border-left: 4px solid #10b981;">
                        <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 18px;">
                            <i class="fas fa-users"></i>
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
                            <button onclick="openGroupChat('${group.id}')" style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                                <i class="fas fa-comment"></i> Chat
                            </button>
                            <button onclick="deleteGroup('${group.id}'); this.closest('.overlay').remove();" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
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
}

// Override the existing showMyGroups function
window.authManager = window.authManager || {};
window.authManager.showMyGroups = showMyGroupsInModal;

// Also handle the groups button click
setTimeout(() => {
    const groupsBtn = document.getElementById('groupsBtn');
    if (groupsBtn) {
        groupsBtn.onclick = showMyGroupsInModal;
    }
    
    // Handle influencer groups button
    const influencerGroupsBtn = document.querySelector('[onclick*="showMyGroups"]');
    if (influencerGroupsBtn) {
        influencerGroupsBtn.onclick = showMyGroupsInModal;
    }
}, 2000);

console.log('🔘 Groups button handler ready!');
console.log('🧪 Click the groups button to see your groups!');