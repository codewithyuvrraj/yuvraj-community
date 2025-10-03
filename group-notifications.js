// Group Notifications Manager
class GroupNotificationManager {
    constructor() {
        // Use global supabase instance
    }

    // Send notification when user is added to group
    async notifyGroupAddition(groupId, addedUserId, addedByUserId) {
        try {
            // Get group details
            const { data: group } = await window.supabase
                .from('groups')
                .select('name, creator_id')
                .eq('id', groupId)
                .single();

            // Get adder details
            const { data: adder } = await window.supabase
                .from('profiles')
                .select('full_name, username, profile_photo')
                .eq('id', addedByUserId)
                .single();

            if (!group || !adder) return;

            // Create notification
            const { error } = await window.supabase
                .from('group_notifications')
                .insert({
                    user_id: addedUserId,
                    group_id: groupId,
                    added_by_user_id: addedByUserId,
                    notification_type: 'group_addition',
                    data: {
                        group_name: group.name,
                        adder_name: adder.full_name || adder.username,
                        adder_username: adder.username,
                        adder_photo: adder.profile_photo
                    },
                    read: false,
                    created_at: new Date().toISOString()
                });

            if (error) throw error;
            console.log('Group addition notification sent successfully');
        } catch (error) {
            console.error('Error sending group addition notification:', error);
        }
    }

    // Send notification when user is added to channel
    async notifyChannelAddition(channelId, addedUserId, addedByUserId) {
        try {
            // Get channel details
            const { data: channel } = await window.supabase
                .from('channels')
                .select('name, creator_id')
                .eq('id', channelId)
                .single();

            // Get adder details
            const { data: adder } = await window.supabase
                .from('profiles')
                .select('full_name, username, profile_photo')
                .eq('id', addedByUserId)
                .single();

            if (!channel || !adder) return;

            // Create notification
            const { error } = await window.supabase
                .from('group_notifications')
                .insert({
                    user_id: addedUserId,
                    channel_id: channelId,
                    added_by_user_id: addedByUserId,
                    notification_type: 'channel_addition',
                    data: {
                        channel_name: channel.name,
                        adder_name: adder.full_name || adder.username,
                        adder_username: adder.username,
                        adder_photo: adder.profile_photo
                    },
                    read: false,
                    created_at: new Date().toISOString()
                });

            if (error) throw error;
            console.log('Channel addition notification sent successfully');
        } catch (error) {
            console.error('Error sending channel addition notification:', error);
        }
    }

    // Get unread group notifications count
    async getUnreadGroupNotificationsCount(userId) {
        try {
            const { count, error } = await window.supabase
                .from('group_notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('read', false);

            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Error getting unread group notifications count:', error);
            return 0;
        }
    }

    // Get group notifications for user
    async getGroupNotifications(userId, limit = 20) {
        try {
            const { data, error } = await window.supabase
                .from('group_notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting group notifications:', error);
            return [];
        }
    }

    // Mark group notification as read
    async markGroupNotificationRead(notificationId, userId) {
        try {
            const { error } = await window.supabase
                .from('group_notifications')
                .update({ read: true })
                .eq('id', notificationId)
                .eq('user_id', userId);

            if (error) throw error;
            console.log('Group notification marked as read');
        } catch (error) {
            console.error('Error marking group notification as read:', error);
        }
    }

    // Mark all group notifications as read
    async markAllGroupNotificationsRead(userId) {
        try {
            const { error } = await window.supabase
                .from('group_notifications')
                .update({ read: true })
                .eq('user_id', userId)
                .eq('read', false);

            if (error) throw error;
            console.log('All group notifications marked as read');
        } catch (error) {
            console.error('Error marking all group notifications as read:', error);
        }
    }
}

// Make globally available
window.GroupNotificationManager = GroupNotificationManager;

// Initialize when supabase is available
if (window.supabase) {
    window.groupNotificationManager = new GroupNotificationManager();
}