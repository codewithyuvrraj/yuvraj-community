// Group Leave Manager - Handle leaving groups and channels
class GroupLeaveManager {
    constructor() {
        // Use global supabase instance
    }

    async leaveGroup(groupId, userId) {
        try {
            // Remove user from group_members table
            const { error } = await window.supabase
                .from('group_members')
                .delete()
                .eq('group_id', groupId)
                .eq('user_id', userId);

            if (error) throw error;

            return { success: true, message: 'Left group successfully' };
        } catch (error) {
            console.error('Error leaving group:', error);
            return { success: false, error: error.message };
        }
    }

    async leaveChannel(channelId, userId) {
        try {
            // Remove user from channel_members table
            const { error } = await window.supabase
                .from('channel_members')
                .delete()
                .eq('channel_id', channelId)
                .eq('user_id', userId);

            if (error) throw error;

            return { success: true, message: 'Left channel successfully' };
        } catch (error) {
            console.error('Error leaving channel:', error);
            return { success: false, error: error.message };
        }
    }

    async showLeaveGroupsModal() {
        try {
            // Get groups where user is a member but not creator
            const { data: memberGroups, error } = await window.supabase
                .from('group_members')
                .select('group_id')
                .eq('user_id', window.authManager.currentUser.id);

            if (error) throw error;

            const groupIds = memberGroups?.map(m => m.group_id) || [];

            if (groupIds.length === 0) {
                this.showEmptyModal('groups');
                return;
            }

            // Get group details
            const { data: groups, error: groupsError } = await window.supabase
                .from('groups')
                .select('id, name, description, creator_id')
                .in('id', groupIds)
                .neq('creator_id', window.authManager.currentUser.id);

            if (groupsError) throw groupsError;

            this.displayLeaveModal(groups || [], 'groups');

        } catch (error) {
            console.error('Error loading groups to leave:', error);
            window.authManager.showNotification('Failed to load groups', 'error');
        }
    }

    showEmptyModal(type) {
        const modal = document.createElement('div');
        modal.className = 'overlay';
        modal.innerHTML = `
            <div class="settings-modal" style="max-width: 400px;">
                <div class="settings-header" style="background: #ef4444; color: white;">
                    <h3><i class="fas fa-sign-out-alt"></i> Leave ${type === 'groups' ? 'Groups' : 'Channels'}</h3>
                    <button class="close-btn" onclick="this.closest('.overlay').remove()" style="color: white;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="settings-content" style="text-align: center; padding: 40px 20px;">
                    <i class="fas fa-users" style="font-size: 48px; color: #d1d5db; margin-bottom: 16px;"></i>
                    <h3>No ${type === 'groups' ? 'Groups' : 'Channels'} to Leave</h3>
                    <p style="color: #6b7280;">You are not a member of any ${type === 'groups' ? 'groups' : 'channels'} that you can leave.</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    displayLeaveModal(items, type) {
        const modal = document.createElement('div');
        modal.className = 'overlay';
        modal.innerHTML = `
            <div class="settings-modal" style="max-width: 500px; max-height: 90vh;">
                <div class="settings-header" style="background: #ef4444; color: white;">
                    <h3><i class="fas fa-sign-out-alt"></i> Leave ${type === 'groups' ? 'Groups' : 'Channels'}</h3>
                    <button class="close-btn" onclick="this.closest('.overlay').remove()" style="color: white;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="settings-content" style="max-height: 70vh; overflow-y: auto;">
                    ${items.length === 0 ? `
                        <div style="text-align: center; padding: 40px 20px; color: #6b7280;">
                            <i class="fas fa-users" style="font-size: 48px; margin-bottom: 16px;"></i>
                            <h3>No ${type === 'groups' ? 'Groups' : 'Channels'} to Leave</h3>
                            <p>You can only leave ${type === 'groups' ? 'groups' : 'channels'} that you didn't create.</p>
                        </div>
                    ` : `
                        ${items.map(item => `
                            <div style="display: flex; align-items: center; padding: 16px; background: #fef2f2; border-radius: 12px; margin-bottom: 12px; border-left: 4px solid #ef4444;">
                                <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #ef4444, #dc2626); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 18px; margin-right: 16px;">
                                    ${item.name.charAt(0).toUpperCase()}
                                </div>
                                <div style="flex: 1; text-align: left;">
                                    <div style="font-weight: 600; font-size: 16px; color: #1f2937; margin-bottom: 4px;">${item.name}</div>
                                    <div style="color: #6b7280; font-size: 14px;">${item.description || 'No description'}</div>
                                </div>
                                <button onclick="window.groupLeaveManager.confirmLeave('${item.id}', '${item.name}', '${type}')" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                                    <i class="fas fa-sign-out-alt"></i> Leave
                                </button>
                            </div>
                        `).join('')}
                    `}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    confirmLeave(itemId, itemName, type) {
        const modal = document.createElement('div');
        modal.className = 'overlay';
        modal.innerHTML = `
            <div class="settings-modal" style="max-width: 400px;">
                <div class="settings-header" style="background: #ef4444; color: white;">
                    <h3><i class="fas fa-exclamation-triangle"></i> Confirm Leave</h3>
                </div>
                <div class="settings-content" style="padding: 20px; text-align: center;">
                    <p style="margin-bottom: 20px; color: #374151;">
                        Are you sure you want to leave <strong>${itemName}</strong>?
                    </p>
                    <p style="margin-bottom: 20px; font-size: 14px; color: #6b7280;">
                        You will lose access to all messages and content in this ${type === 'groups' ? 'group' : 'channel'}.
                    </p>
                    <div style="display: flex; gap: 12px;">
                        <button onclick="window.groupLeaveManager.executeLeave('${itemId}', '${type}')" style="background: #ef4444; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: 600; flex: 1;">
                            <i class="fas fa-sign-out-alt"></i> Leave
                        </button>
                        <button onclick="this.closest('.overlay').remove()" style="background: #6b7280; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: 600; flex: 1;">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async executeLeave(itemId, type) {
        document.querySelector('.overlay').remove();

        let result;
        if (type === 'groups') {
            result = await this.leaveGroup(itemId, window.authManager.currentUser.id);
        } else {
            result = await this.leaveChannel(itemId, window.authManager.currentUser.id);
        }

        if (result.success) {
            window.authManager.showNotification(result.message, 'success');
            // Refresh the leave modal
            setTimeout(() => {
                this.showLeaveGroupsModal();
            }, 500);
        } else {
            window.authManager.showNotification(result.error, 'error');
        }
    }
}

// Initialize globally
window.groupLeaveManager = new GroupLeaveManager();