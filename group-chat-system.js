// Group Chat System with Admin Features
console.log('💬 Setting up group chat system...');

// Function to open group chat
window.openGroupChat = function(groupId) {
    const groups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
    const group = groups.find(g => g.id === groupId);
    const currentUser = JSON.parse(localStorage.getItem('businessconnect_current_user') || '{}');
    
    if (!group) {
        alert('Group not found');
        return;
    }
    
    // Close any existing modals
    document.querySelectorAll('.overlay').forEach(modal => modal.remove());
    
    // Get group messages from localStorage
    const messages = JSON.parse(localStorage.getItem(`group_messages_${groupId}`) || '[]');
    
    // Check if user is admin
    const isAdmin = group.created_by === currentUser.id;
    
    const modal = document.createElement('div');
    modal.className = 'overlay fullscreen-chat';
    modal.innerHTML = `
        <div class="settings-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; max-width: none; max-height: none; border-radius: 0; display: flex; flex-direction: column;">
            <div class="settings-header" style="background: #10b981; color: white; cursor: pointer;" onclick="openGroupSettings('${groupId}')">
                <h3><i class="fas fa-users"></i> ${group.name} ${isAdmin ? '<i class="fas fa-crown" style="color: #fbbf24; margin-left: 8px;" title="Admin"></i>' : ''}</h3>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <span style="font-size: 12px; opacity: 0.8;">${group.members?.length || 1} members • Click to manage</span>
                    <button class="close-btn" onclick="this.closest('.overlay').remove()" style="color: white;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <!-- Chat Messages Area -->
            <div id="chatMessages" style="flex: 1; padding: 20px; overflow-y: auto; background: #f8fafc; border-bottom: 1px solid #e5e7eb;">
                ${messages.length === 0 ? `
                    <div style="text-align: center; color: #6b7280; padding: 40px 20px;">
                        <i class="fas fa-comments" style="font-size: 48px; margin-bottom: 16px; color: #10b981;"></i>
                        <h3>Start the conversation</h3>
                        <p>Be the first to send a message in this group</p>
                    </div>
                ` : messages.map(msg => `
                    <div style="margin-bottom: 16px; display: flex; align-items: flex-start; gap: 12px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #1d4ed8); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 12px; flex-shrink: 0;">
                            ${msg.sender_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <span style="font-weight: 600; color: #374151; font-size: 14px;">${msg.sender_name || 'Unknown'}</span>
                                <span style="font-size: 11px; color: #9ca3af;">${new Date(msg.created_at).toLocaleTimeString()}</span>
                            </div>
                            <div style="background: white; padding: 8px 12px; border-radius: 8px; border: 1px solid #e5e7eb; font-size: 14px; color: #374151;">
                                ${msg.content}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <!-- Message Input -->
            <div style="padding: 16px; background: white; border-top: 1px solid #e5e7eb;">
                <div style="display: flex; gap: 12px; align-items: center;">
                    <input type="text" id="messageInput" placeholder="Type a message..." style="flex: 1; padding: 12px; border: 2px solid #e5e7eb; border-radius: 20px; font-size: 14px;" onkeypress="if(event.key==='Enter') sendGroupMessage('${groupId}')">
                    <button onclick="sendGroupMessage('${groupId}')" style="background: #10b981; color: white; border: none; padding: 12px 16px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Focus on message input
    setTimeout(() => {
        document.getElementById('messageInput').focus();
    }, 100);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
};

// Function to send group message
window.sendGroupMessage = function(groupId) {
    const messageInput = document.getElementById('messageInput');
    const content = messageInput.value.trim();
    
    if (!content) return;
    
    const currentUser = JSON.parse(localStorage.getItem('businessconnect_current_user') || '{}');
    
    const message = {
        id: Date.now().toString(),
        group_id: groupId,
        sender_id: currentUser.id,
        sender_name: currentUser.full_name || currentUser.username,
        content: content,
        created_at: new Date().toISOString()
    };
    
    // Save message
    const messages = JSON.parse(localStorage.getItem(`group_messages_${groupId}`) || '[]');
    messages.push(message);
    localStorage.setItem(`group_messages_${groupId}`, JSON.stringify(messages));
    
    // Clear input
    messageInput.value = '';
    
    // Refresh chat
    openGroupChat(groupId);
};

// Function to open group settings
window.openGroupSettings = function(groupId) {
    const groups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
    const group = groups.find(g => g.id === groupId);
    const currentUser = JSON.parse(localStorage.getItem('businessconnect_current_user') || '{}');
    
    if (!group) {
        alert('Group not found');
        return;
    }
    
    const isAdmin = group.created_by === currentUser.id;
    
    // Close existing modals
    document.querySelectorAll('.overlay').forEach(modal => modal.remove());
    
    const modal = document.createElement('div');
    modal.className = 'overlay';
    modal.innerHTML = `
        <div class="settings-modal" style="max-width: 500px; max-height: 90vh;">
            <div class="settings-header" style="background: #3b82f6; color: white;">
                <h3><i class="fas fa-cog"></i> Group Settings</h3>
                <button class="close-btn" onclick="this.closest('.overlay').remove()" style="color: white;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="settings-content" style="max-height: 70vh; overflow-y: auto;">
                
                <!-- Group Info -->
                <div class="settings-section" style="background: #f8fafc; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
                    <h4><i class="fas fa-info-circle"></i> Group Information</h4>
                    ${isAdmin ? `
                        <div class="setting-item" style="flex-direction: column; align-items: flex-start; margin-bottom: 16px;">
                            <label>Group Name</label>
                            <input type="text" id="groupNameEdit" value="${group.name}" style="width: 100%; padding: 8px 12px; border: 2px solid #e5e7eb; border-radius: 8px; margin-top: 4px;">
                        </div>
                        <div class="setting-item" style="flex-direction: column; align-items: flex-start; margin-bottom: 16px;">
                            <label>Description</label>
                            <textarea id="groupDescEdit" style="width: 100%; padding: 8px 12px; border: 2px solid #e5e7eb; border-radius: 8px; margin-top: 4px; min-height: 60px; resize: vertical;">${group.description || ''}</textarea>
                        </div>
                        <div class="setting-item">
                            <button onclick="updateGroupInfo('${groupId}')" style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                                <i class="fas fa-save"></i> Save Changes
                            </button>
                        </div>
                    ` : `
                        <div style="padding: 16px; background: white; border-radius: 8px; margin-bottom: 12px;">
                            <div style="font-weight: 600; margin-bottom: 8px;">${group.name}</div>
                            <div style="color: #6b7280; font-size: 14px;">${group.description || 'No description'}</div>
                        </div>
                    `}
                </div>
                
                <!-- Members Section -->
                <div class="settings-section" style="background: #f0fdf4; border-left: 4px solid #10b981; margin-bottom: 20px;">
                    <h4><i class="fas fa-users"></i> Members (${group.members?.length || 1})</h4>
                    ${isAdmin ? `
                        <div class="setting-item" style="margin-bottom: 16px;">
                            <input type="text" id="addMemberInput" placeholder="Enter username to add" style="flex: 1; padding: 8px 12px; border: 2px solid #e5e7eb; border-radius: 8px; margin-right: 8px;">
                            <button onclick="addGroupMember('${groupId}')" style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                                <i class="fas fa-user-plus"></i> Add
                            </button>
                        </div>
                    ` : ''}
                    
                    <div id="membersList">
                        ${(group.members || [currentUser.id]).map(memberId => {
                            const isCreator = memberId === group.created_by;
                            return `
                                <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: white; border-radius: 8px; margin-bottom: 8px;">
                                    <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 12px;">
                                        ${memberId === currentUser.id ? (currentUser.full_name || currentUser.username).charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <div style="flex: 1;">
                                        <div style="font-weight: 600; font-size: 14px;">
                                            ${memberId === currentUser.id ? (currentUser.full_name || currentUser.username) : `User ${memberId.slice(-4)}`}
                                            ${isCreator ? '<span style="background: #fbbf24; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 8px;">ADMIN</span>' : ''}
                                            ${memberId === currentUser.id ? '<span style="background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 8px;">YOU</span>' : ''}
                                        </div>
                                    </div>
                                    ${isAdmin && memberId !== currentUser.id ? `
                                        <div style="display: flex; gap: 4px;">
                                            ${!isCreator ? `<button onclick="makeGroupAdmin('${groupId}', '${memberId}')" style="background: #fbbf24; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Make Admin</button>` : ''}
                                            <button onclick="removeGroupMember('${groupId}', '${memberId}')" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Remove</button>
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="settings-section" style="background: #fef2f2; border-left: 4px solid #ef4444;">
                    <h4><i class="fas fa-exclamation-triangle"></i> Actions</h4>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        <button onclick="openGroupChat('${groupId}'); this.closest('.overlay').remove();" style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-comment"></i> Back to Chat
                        </button>
                        ${!isAdmin ? `
                            <button onclick="leaveGroup('${groupId}')" style="background: #f59e0b; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                                <i class="fas fa-sign-out-alt"></i> Leave Group
                            </button>
                        ` : `
                            <button onclick="deleteGroupPermanently('${groupId}')" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                                <i class="fas fa-trash"></i> Delete Group
                            </button>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
};

// Function to update group info
window.updateGroupInfo = function(groupId) {
    const newName = document.getElementById('groupNameEdit').value.trim();
    const newDesc = document.getElementById('groupDescEdit').value.trim();
    
    if (!newName) {
        alert('Group name is required');
        return;
    }
    
    let groups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
    const groupIndex = groups.findIndex(g => g.id === groupId);
    
    if (groupIndex !== -1) {
        groups[groupIndex].name = newName;
        groups[groupIndex].description = newDesc;
        groups[groupIndex].updated_at = new Date().toISOString();
        
        localStorage.setItem('businessconnect_groups', JSON.stringify(groups));
        
        alert('Group updated successfully!');
        
        // Refresh settings and groups list
        openGroupSettings(groupId);
        
        // Also refresh the groups list if it's open
        setTimeout(() => {
            const groupsModal = document.querySelector('.overlay .settings-header h3');
            if (groupsModal && groupsModal.textContent.includes('My Groups')) {
                showMyGroupsWithForm();
            }
        }, 200);
    }
};

// Function to add group member
window.addGroupMember = function(groupId) {
    const username = document.getElementById('addMemberInput').value.trim();
    
    if (!username) {
        alert('Please enter a username');
        return;
    }
    
    // For demo, just add a fake user ID
    const newMemberId = `user_${username}_${Date.now()}`;
    
    let groups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
    const groupIndex = groups.findIndex(g => g.id === groupId);
    
    if (groupIndex !== -1) {
        if (!groups[groupIndex].members) {
            groups[groupIndex].members = [];
        }
        
        groups[groupIndex].members.push(newMemberId);
        localStorage.setItem('businessconnect_groups', JSON.stringify(groups));
        
        alert(`User "${username}" added to group!`);
        
        // Refresh settings and groups list
        openGroupSettings(groupId);
        
        // Also refresh the groups list if it's open
        setTimeout(() => {
            const groupsModal = document.querySelector('.overlay .settings-header h3');
            if (groupsModal && groupsModal.textContent.includes('My Groups')) {
                showMyGroupsWithForm();
            }
        }, 200);
    }
};

// Function to remove group member
window.removeGroupMember = function(groupId, memberId) {
    if (confirm('Are you sure you want to remove this member?')) {
        let groups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
        const groupIndex = groups.findIndex(g => g.id === groupId);
        
        if (groupIndex !== -1) {
            groups[groupIndex].members = groups[groupIndex].members.filter(id => id !== memberId);
            localStorage.setItem('businessconnect_groups', JSON.stringify(groups));
            
            alert('Member removed successfully!');
            
            // Refresh settings and groups list
            openGroupSettings(groupId);
            
            // Also refresh the groups list if it's open
            setTimeout(() => {
                const groupsModal = document.querySelector('.overlay .settings-header h3');
                if (groupsModal && groupsModal.textContent.includes('My Groups')) {
                    showMyGroupsWithForm();
                }
            }, 200);
        }
    }
};

// Function to make group admin
window.makeGroupAdmin = function(groupId, memberId) {
    if (confirm('Make this user an admin?')) {
        alert('Admin privileges granted! (Feature coming soon)');
    }
};

// Function to leave group
window.leaveGroup = function(groupId) {
    if (confirm('Are you sure you want to leave this group?')) {
        const currentUser = JSON.parse(localStorage.getItem('businessconnect_current_user') || '{}');
        let groups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
        const groupIndex = groups.findIndex(g => g.id === groupId);
        
        if (groupIndex !== -1) {
            groups[groupIndex].members = groups[groupIndex].members.filter(id => id !== currentUser.id);
            localStorage.setItem('businessconnect_groups', JSON.stringify(groups));
            
            alert('You have left the group');
            
            // Close modal and refresh groups list
            document.querySelectorAll('.overlay').forEach(modal => modal.remove());
            setTimeout(() => showMyGroupsWithForm(), 100);
        }
    }
};

// Function to delete group permanently
window.deleteGroupPermanently = function(groupId) {
    if (confirm('Are you sure you want to delete this group permanently? This action cannot be undone.')) {
        let groups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
        groups = groups.filter(g => g.id !== groupId);
        localStorage.setItem('businessconnect_groups', JSON.stringify(groups));
        
        // Also delete group messages
        localStorage.removeItem(`group_messages_${groupId}`);
        
        alert('Group deleted permanently');
        
        // Close modal and refresh groups list
        document.querySelectorAll('.overlay').forEach(modal => modal.remove());
        setTimeout(() => showMyGroupsWithForm(), 100);
    }
};

console.log('💬 Group chat system with admin features ready!');
console.log('🧪 Features: Chat, Settings, Add/Remove Members, Admin Controls');