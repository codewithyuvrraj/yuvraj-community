// Group Profile Picture Feature
console.log('🖼️ Setting up group profile picture feature...');

// Function to handle group profile picture upload
window.uploadGroupProfilePicture = function(groupId) {
    const currentUser = JSON.parse(localStorage.getItem('businessconnect_current_user') || '{}');
    const groups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
    const group = groups.find(g => g.id === groupId);
    
    if (!group) {
        alert('Group not found');
        return;
    }
    
    // Check if user is admin
    if (group.created_by !== currentUser.id) {
        alert('Only admins can change the group profile picture');
        return;
    }
    
    // Create file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB');
            return;
        }
        
        // Create URL for the image
        const imageUrl = URL.createObjectURL(file);
        
        // Update group with new profile picture
        const groupIndex = groups.findIndex(g => g.id === groupId);
        if (groupIndex !== -1) {
            groups[groupIndex].profile_picture = imageUrl;
            groups[groupIndex].updated_at = new Date().toISOString();
            localStorage.setItem('businessconnect_groups', JSON.stringify(groups));
            
            console.log('✅ Group profile picture updated:', imageUrl);
            alert('Group profile picture updated successfully!');
            
            // Refresh both settings modal and groups list
            setTimeout(() => {
                openGroupSettings(groupId);
                // Also refresh the groups list if it's open
                const groupsModal = document.querySelector('.overlay .settings-header h3');
                if (groupsModal && groupsModal.textContent.includes('My Groups')) {
                    setTimeout(() => showMyGroupsWithForm(), 200);
                }
            }, 100);
        }
        
        // Clean up
        document.body.removeChild(fileInput);
    };
    
    document.body.appendChild(fileInput);
    fileInput.click();
};

// Function to remove group profile picture
window.removeGroupProfilePicture = function(groupId) {
    if (!confirm('Are you sure you want to remove the group profile picture?')) {
        return;
    }
    
    const groups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
    const groupIndex = groups.findIndex(g => g.id === groupId);
    
    if (groupIndex !== -1) {
        delete groups[groupIndex].profile_picture;
        groups[groupIndex].updated_at = new Date().toISOString();
        localStorage.setItem('businessconnect_groups', JSON.stringify(groups));
        
        alert('Group profile picture removed successfully!');
        
        // Refresh both settings modal and groups list
        setTimeout(() => {
            openGroupSettings(groupId);
            // Also refresh the groups list if it's open
            const groupsModal = document.querySelector('.overlay .settings-header h3');
            if (groupsModal && groupsModal.textContent.includes('My Groups')) {
                setTimeout(() => showMyGroupsWithForm(), 200);
            }
        }, 100);
    }
};

// Override the openGroupSettings function to include profile picture
const originalOpenGroupSettings = window.openGroupSettings;
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
                
                <!-- Group Profile Picture -->
                <div class="settings-section" style="background: #ede9fe; border-left: 4px solid #8b5cf6; margin-bottom: 20px;">
                    <h4><i class="fas fa-image"></i> Group Profile Picture</h4>
                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                        <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 24px; overflow: hidden; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                            ${group.profile_picture ? 
                                `<img src="${group.profile_picture}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` :
                                group.name.charAt(0).toUpperCase()
                            }
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; margin-bottom: 8px;">${group.name}</div>
                            ${isAdmin ? `
                                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                    <button onclick="uploadGroupProfilePicture('${groupId}')" style="background: #8b5cf6; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                                        <i class="fas fa-camera"></i> ${group.profile_picture ? 'Change' : 'Add'} Picture
                                    </button>
                                    ${group.profile_picture ? `
                                        <button onclick="removeGroupProfilePicture('${groupId}')" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                                            <i class="fas fa-trash"></i> Remove
                                        </button>
                                    ` : ''}
                                </div>
                            ` : `
                                <div style="color: #6b7280; font-size: 12px;">Only admins can change the group picture</div>
                            `}
                        </div>
                    </div>
                </div>
                
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

// Override the group display to show profile pictures
const originalShowMyGroupsWithForm = window.showMyGroupsWithForm;
window.showMyGroupsWithForm = function() {
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
                    <button class="btn btn-icon" onclick="showCreateGroupForm()" style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 8px; border-radius: 50%;" title="Create Group">
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
                        <button class="btn" style="background: #10b981; color: white; margin-top: 16px;" onclick="showCreateGroupForm()">
                            <i class="fas fa-plus"></i> Create Group
                        </button>
                    </div>
                ` : myGroups.map(group => `
                    <div style="display: flex; align-items: center; gap: 16px; padding: 16px; background: #f0fdf4; border-radius: 12px; margin-bottom: 12px; border-left: 4px solid #10b981;">
                        <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 18px; overflow: hidden; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            ${group.profile_picture ? 
                                `<img src="${group.profile_picture}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` :
                                group.name.charAt(0).toUpperCase()
                            }
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
                            <button onclick="deleteGroupWithConfirm('${group.id}')" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
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

// Override the group chat to show profile picture
const originalOpenGroupChat = window.openGroupChat;
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
    modal.className = 'overlay';
    modal.innerHTML = `
        <div class="settings-modal" style="max-width: 600px; max-height: 90vh; display: flex; flex-direction: column;">
            <div class="settings-header" style="background: #10b981; color: white; cursor: pointer; display: flex; align-items: center; gap: 12px;" onclick="openGroupSettings('${groupId}')">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #059669, #047857); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 16px; overflow: hidden; border: 2px solid rgba(255,255,255,0.3);">
                    ${group.profile_picture ? 
                        `<img src="${group.profile_picture}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` :
                        group.name.charAt(0).toUpperCase()
                    }
                </div>
                <div style="flex: 1;">
                    <h3 style="margin: 0; display: flex; align-items: center; gap: 8px;">
                        ${group.name} 
                        ${isAdmin ? '<i class="fas fa-crown" style="color: #fbbf24;" title="Admin"></i>' : ''}
                    </h3>
                    <div style="font-size: 12px; opacity: 0.8;">${group.members?.length || 1} members • Click to manage</div>
                </div>
                <button class="close-btn" onclick="event.stopPropagation(); this.closest('.overlay').remove()" style="color: white;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <!-- Chat Messages Area -->
            <div id="chatMessages" style="flex: 1; padding: 20px; overflow-y: auto; max-height: 400px; background: #f8fafc; border-bottom: 1px solid #e5e7eb;">
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

console.log('🖼️ Group profile picture feature ready!');
console.log('🧪 Features: Upload, Change, Remove (Admin only)');