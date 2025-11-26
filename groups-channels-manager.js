// Groups and Channels Manager - Local and Nhost Integration
class GroupsChannelsManager {
    constructor() {
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        // Initialize local storage if needed
        if (!localStorage.getItem('businessconnect_groups')) {
            localStorage.setItem('businessconnect_groups', JSON.stringify([]));
        }
        if (!localStorage.getItem('businessconnect_channels')) {
            localStorage.setItem('businessconnect_channels', JSON.stringify([]));
        }
        
        this.initialized = true;
        console.log('Groups and Channels Manager initialized');
    }

    // Get all groups for current user
    async getMyGroups() {
        await this.initialize();
        
        if (!window.authManager?.currentUser) return [];
        
        if (window.isNhostEnabled) {
            try {
                const { data: groupsData, error } = await window.nhost.graphql.request(`
                    query GetMyGroups($userId: uuid!) {
                        groups(where: {created_by: {_eq: $userId}}, order_by: {created_at: desc}) {
                            id
                            name
                            photo_url
                            created_at
                        }
                    }
                `, { userId: window.authManager.currentUser.id });
                
                if (!error && groupsData.data.groups) {
                    return groupsData.data.groups;
                }
            } catch (error) {
                console.error('Error fetching groups from Nhost:', error);
            }
        }
        
        // Local fallback
        const localGroups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
        return localGroups.filter(g => g.created_by === window.authManager.currentUser.id);
    }

    // Get all channels for current user
    async getMyChannels() {
        await this.initialize();
        
        if (!window.authManager?.currentUser) return [];
        
        if (window.isNhostEnabled) {
            try {
                const { data: channelsData, error } = await window.nhost.graphql.request(`
                    query GetMyChannels($userId: uuid!) {
                        channels(where: {created_by: {_eq: $userId}}, order_by: {created_at: desc}) {
                            id
                            name
                            photo_url
                            created_at
                        }
                    }
                `, { userId: window.authManager.currentUser.id });
                
                if (!error && channelsData.data.channels) {
                    return channelsData.data.channels;
                }
            } catch (error) {
                console.error('Error fetching channels from Nhost:', error);
            }
        }
        
        // Local fallback
        const localChannels = JSON.parse(localStorage.getItem('businessconnect_channels') || '[]');
        return localChannels.filter(c => c.created_by === window.authManager.currentUser.id);
    }

    // Create a new group
    async createGroup(name, description = '', photoUrl = null) {
        await this.initialize();
        
        if (!window.authManager?.currentUser) {
            throw new Error('User not authenticated');
        }
        
        if (window.isNhostEnabled) {
            try {
                const { data: groupData, error } = await window.nhost.graphql.request(`
                    mutation CreateGroup($group: groups_insert_input!) {
                        insert_groups_one(object: $group) {
                            id
                            name
                            photo_url
                            created_by
                            created_at
                        }
                    }
                `, {
                    group: {
                        name: name,
                        photo_url: photoUrl,
                        created_by: window.authManager.currentUser.id
                    }
                });
                
                if (error) throw error;
                
                const newGroup = groupData.data.insert_groups_one;
                
                // Add creator as first member
                await this.addUserToGroup(newGroup.id, window.authManager.currentUser.id);
                
                return newGroup;
            } catch (error) {
                console.error('Error creating group in Nhost:', error);
                // Fall through to local creation
            }
        }
        
        // Local fallback
        const localGroups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
        const newGroup = {
            id: 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: name,
            photo_url: photoUrl,
            created_by: window.authManager.currentUser.id,
            created_at: new Date().toISOString()
        };
        
        localGroups.push(newGroup);
        localStorage.setItem('businessconnect_groups', JSON.stringify(localGroups));
        
        // Add creator as first member
        const localMembers = [window.authManager.currentUser.id];
        localStorage.setItem(`group_members_${newGroup.id}`, JSON.stringify(localMembers));
        
        return newGroup;
    }

    // Create a new channel
    async createChannel(name, description = '', photoUrl = null) {
        await this.initialize();
        
        if (!window.authManager?.currentUser) {
            throw new Error('User not authenticated');
        }
        
        if (window.isNhostEnabled) {
            try {
                const { data: channelData, error } = await window.nhost.graphql.request(`
                    mutation CreateChannel($channel: channels_insert_input!) {
                        insert_channels_one(object: $channel) {
                            id
                            name
                            photo_url
                            created_by
                            created_at
                        }
                    }
                `, {
                    channel: {
                        name: name,
                        photo_url: photoUrl,
                        created_by: window.authManager.currentUser.id
                    }
                });
                
                if (error) throw error;
                
                const newChannel = channelData.data.insert_channels_one;
                
                // Add creator as first member
                await this.addUserToChannel(newChannel.id, window.authManager.currentUser.id);
                
                return newChannel;
            } catch (error) {
                console.error('Error creating channel in Nhost:', error);
                // Fall through to local creation
            }
        }
        
        // Local fallback
        const localChannels = JSON.parse(localStorage.getItem('businessconnect_channels') || '[]');
        const newChannel = {
            id: 'channel_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: name,
            photo_url: photoUrl,
            created_by: window.authManager.currentUser.id,
            created_at: new Date().toISOString()
        };
        
        localChannels.push(newChannel);
        localStorage.setItem('businessconnect_channels', JSON.stringify(localChannels));
        
        // Add creator as first member
        const localMembers = [window.authManager.currentUser.id];
        localStorage.setItem(`channel_members_${newChannel.id}`, JSON.stringify(localMembers));
        
        return newChannel;
    }

    // Add user to group
    async addUserToGroup(groupId, userId) {
        if (window.isNhostEnabled) {
            try {
                const { error } = await window.nhost.graphql.request(`
                    mutation AddGroupMember($group_id: uuid!, $user_id: uuid!) {
                        insert_group_members_one(object: {group_id: $group_id, user_id: $user_id}) {
                            id
                        }
                    }
                `, {
                    group_id: groupId,
                    user_id: userId
                });
                
                if (!error) return true;
            } catch (error) {
                console.error('Error adding user to group in Nhost:', error);
            }
        }
        
        // Local fallback
        const localMembers = JSON.parse(localStorage.getItem(`group_members_${groupId}`) || '[]');
        if (!localMembers.includes(userId)) {
            localMembers.push(userId);
            localStorage.setItem(`group_members_${groupId}`, JSON.stringify(localMembers));
        }
        return true;
    }

    // Add user to channel
    async addUserToChannel(channelId, userId) {
        if (window.isNhostEnabled) {
            try {
                const { error } = await window.nhost.graphql.request(`
                    mutation AddChannelMember($channel_id: uuid!, $user_id: uuid!) {
                        insert_channel_members_one(object: {channel_id: $channel_id, user_id: $user_id}) {
                            id
                        }
                    }
                `, {
                    channel_id: channelId,
                    user_id: userId
                });
                
                if (!error) return true;
            } catch (error) {
                console.error('Error adding user to channel in Nhost:', error);
            }
        }
        
        // Local fallback
        const localMembers = JSON.parse(localStorage.getItem(`channel_members_${channelId}`) || '[]');
        if (!localMembers.includes(userId)) {
            localMembers.push(userId);
            localStorage.setItem(`channel_members_${channelId}`, JSON.stringify(localMembers));
        }
        return true;
    }

    // Get group members
    async getGroupMembers(groupId) {
        if (window.isNhostEnabled) {
            try {
                const { data: membersData, error } = await window.nhost.graphql.request(`
                    query GetGroupMembers($groupId: uuid!) {
                        group_members(where: {group_id: {_eq: $groupId}}) {
                            users {
                                id
                                full_name
                                username
                                avatar_url
                                bio
                            }
                        }
                    }
                `, { groupId });
                
                if (!error && membersData.data.group_members) {
                    return membersData.data.group_members.map(member => member.users);
                }
            } catch (error) {
                console.error('Error fetching group members from Nhost:', error);
            }
        }
        
        // Local fallback
        const localMembers = JSON.parse(localStorage.getItem(`group_members_${groupId}`) || '[]');
        const allUsers = JSON.parse(localStorage.getItem('businessconnect_all_users') || '[]');
        return localMembers.map(memberId => 
            allUsers.find(user => user.id === memberId)
        ).filter(Boolean);
    }

    // Get channel members
    async getChannelMembers(channelId) {
        if (window.isNhostEnabled) {
            try {
                const { data: membersData, error } = await window.nhost.graphql.request(`
                    query GetChannelMembers($channelId: uuid!) {
                        channel_members(where: {channel_id: {_eq: $channelId}}) {
                            users {
                                id
                                full_name
                                username
                                avatar_url
                                bio
                            }
                        }
                    }
                `, { channelId });
                
                if (!error && membersData.data.channel_members) {
                    return membersData.data.channel_members.map(member => member.users);
                }
            } catch (error) {
                console.error('Error fetching channel members from Nhost:', error);
            }
        }
        
        // Local fallback
        const localMembers = JSON.parse(localStorage.getItem(`channel_members_${channelId}`) || '[]');
        const allUsers = JSON.parse(localStorage.getItem('businessconnect_all_users') || '[]');
        return localMembers.map(memberId => 
            allUsers.find(user => user.id === memberId)
        ).filter(Boolean);
    }
}

// Initialize the manager
window.groupsChannelsManager = new GroupsChannelsManager();

console.log('Groups and Channels Manager loaded');