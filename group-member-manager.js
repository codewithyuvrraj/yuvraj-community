// Group Member Manager - Handle member operations
class GroupMemberManager {
    constructor() {
        // Use global supabase instance
    }

    async removeUserFromGroup(groupId, userId, currentUserId) {
        try {
            // Check if current user is the group creator
            const { data: group, error: groupError } = await window.supabase
                .from('groups')
                .select('creator_id')
                .eq('id', groupId)
                .single();

            if (groupError) throw groupError;

            if (group.creator_id !== currentUserId) {
                throw new Error('Only group creator can remove members');
            }

            // Remove user from group_members table
            const { error } = await window.supabase
                .from('group_members')
                .delete()
                .eq('group_id', groupId)
                .eq('user_id', userId);

            if (error) throw error;

            return { success: true, message: 'User removed from group successfully' };
        } catch (error) {
            console.error('Error removing user from group:', error);
            return { success: false, error: error.message };
        }
    }

    async removeUserFromChannel(channelId, userId, currentUserId) {
        try {
            // Check if current user is the channel creator
            const { data: channel, error: channelError } = await window.supabase
                .from('channels')
                .select('creator_id')
                .eq('id', channelId)
                .single();

            if (channelError) throw channelError;

            if (channel.creator_id !== currentUserId) {
                throw new Error('Only channel creator can remove members');
            }

            // Remove user from channel_members table
            const { error } = await window.supabase
                .from('channel_members')
                .delete()
                .eq('channel_id', channelId)
                .eq('user_id', userId);

            if (error) throw error;

            return { success: true, message: 'User removed from channel successfully' };
        } catch (error) {
            console.error('Error removing user from channel:', error);
            return { success: false, error: error.message };
        }
    }

    showRemoveConfirmation(memberName, groupName, groupId, userId, type = 'group') {
        const modal = document.createElement('div');
        modal.className = 'overlay';
        modal.innerHTML = `
            <div class="settings-modal" style="max-width: 400px;">
                <div class="settings-header" style="background: #ef4444; color: white;">
                    <h3><i class="fas fa-user-minus"></i> Remove Member</h3>
                    <button class="close-btn" onclick="this.closest('.overlay').remove()" style="color: white;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="settings-content" style="padding: 20px; text-align: center;">
                    <p style="margin-bottom: 20px; color: #374151;">
                        Remove <strong>${memberName}</strong> from ${type} <strong>${groupName}</strong>?
                    </p>
                    <p style="margin-bottom: 20px; font-size: 14px; color: #6b7280;">
                        This action cannot be undone. The user will lose access to this ${type}.
                    </p>
                    <div style="display: flex; gap: 12px;">
                        <button class="btn" style="background: #ef4444; color: white; flex: 1;" 
                                onclick="window.groupMemberManager.executeRemoval('${groupId}', '${userId}', '${type}')">
                            <i class="fas fa-user-minus"></i> Remove
                        </button>
                        <button class="btn" style="background: #6b7280; color: white; flex: 1;" 
                                onclick="this.closest('.overlay').remove()">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async executeRemoval(groupId, userId, type) {
        document.querySelector('.overlay').remove();
        
        let result;
        if (type === 'group') {
            result = await this.removeUserFromGroup(groupId, userId, window.authManager.currentUser.id);
        } else {
            result = await this.removeUserFromChannel(groupId, userId, window.authManager.currentUser.id);
        }

        if (result.success) {
            window.authManager.showNotification(result.message, 'success');
            // Refresh the members view
            if (type === 'group') {
                window.authManager.viewGroupMembers(groupId, 'Group');
            } else {
                window.authManager.viewChannelMembers(groupId, 'Channel');
            }
        } else {
            window.authManager.showNotification(result.error, 'error');
        }
    }
}

// Initialize globally
if (window.supabase) {
    window.groupMemberManager = new GroupMemberManager();
}