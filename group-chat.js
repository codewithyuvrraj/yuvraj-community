// Group Chat Manager - Instant Messaging for Groups
class GroupChatManager {
    constructor() {
        this.currentGroup = null;
        this.pollInterval = null;
    }

    async startGroupChat(groupId) {
        if (!window.authManager || !window.authManager.currentUser) return;

        try {
            // Check if Nhost is available, otherwise use local fallback
            let group;
            if (window.isNhostEnabled) {
                const { data: groupData, error } = await window.nhost.graphql.request(`
                    query GetGroup($id: uuid!) {
                        groups_by_pk(id: $id) {
                            id
                            name
                            photo_url
                            created_by
                            created_at
                        }
                    }
                `, { id: groupId });

                if (error || !groupData.data.groups_by_pk) throw new Error('Group not found');
                group = groupData.data.groups_by_pk;
            } else {
                // Local fallback
                const localGroups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
                group = localGroups.find(g => g.id === groupId);
                if (!group) throw new Error('Group not found');
            }

            this.currentGroup = {
                id: groupId,
                name: group.name,
                photo_url: group.photo_url,
                conversationId: 'group_' + groupId
            };

            this.showGroupChat();
            this.updateGroupHeader();
            await this.loadGroupMessages();
            this.startPolling();

        } catch (error) {
            console.error('Start group chat error:', error);
            window.authManager.showNotification('Failed to open group chat', 'error');
        }
    }

    showGroupChat() {
        const homeFeed = document.getElementById('homeFeed');
        const businessTools = document.getElementById('businessTools');
        const chatMessages = document.getElementById('chatMessages');
        const chatInputContainer = document.getElementById('chatInputContainer');
        const backBtn = document.getElementById('backBtn');
        
        if (homeFeed) homeFeed.style.display = 'none';
        if (businessTools) businessTools.style.display = 'none';
        if (chatMessages) chatMessages.style.display = 'flex';
        if (chatInputContainer) chatInputContainer.style.display = 'block';
        if (backBtn) backBtn.style.display = 'block';
        
        setTimeout(() => {
            const messageInput = document.getElementById('messageInput');
            if (messageInput) messageInput.focus();
        }, 100);
    }

    updateGroupHeader() {
        const chatTitle = document.getElementById('chatTitle');
        const chatStatus = document.getElementById('chatStatus');
        
        if (chatTitle) {
            chatTitle.textContent = this.currentGroup.name + ' 👥';
            chatTitle.style.cursor = 'pointer';
            chatTitle.style.textDecoration = 'underline';
            chatTitle.title = 'Click to view group members';
            chatTitle.onclick = () => {
                console.log('Group name clicked, showing members for:', this.currentGroup.name);
                this.showGroupMembers();
            };
        }
        
        if (chatStatus) {
            chatStatus.innerHTML = '<i class="fas fa-users" style="color: #10b981; font-size: 8px; margin-right: 4px;"></i>Group Chat';
        }
    }

    async loadGroupMessages() {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #667781;"><i class="fas fa-circle" style="animation: pulse 1s infinite;"></i> <i class="fas fa-circle" style="animation: pulse 1s infinite 0.2s;"></i> <i class="fas fa-circle" style="animation: pulse 1s infinite 0.4s;"></i></div>';

        try {
            let messages = [];
            
            if (window.isNhostEnabled) {
                // Use Nhost GraphQL to get messages with sender info
                const { data: messagesData, error } = await window.nhost.graphql.request(`
                    query GetGroupMessages($groupId: uuid!) {
                        messages(where: {conversation_id: {_eq: $groupId}}, order_by: {created_at: asc}) {
                            id
                            text
                            sender_id
                            created_at
                            users {
                                id
                                full_name
                                username
                                avatar_url
                            }
                        }
                    }
                `, { groupId: this.currentGroup.id });
                
                if (!error && messagesData.data.messages) {
                    messages = messagesData.data.messages.map(msg => ({
                        id: msg.id,
                        text: msg.text,
                        sender_id: msg.sender_id,
                        created_at: msg.created_at,
                        sender: msg.users
                    }));
                }
            } else {
                // Local fallback
                const localMessages = JSON.parse(localStorage.getItem(`group_messages_${this.currentGroup.id}`) || '[]');
                messages = localMessages;
            }

            setTimeout(() => {
                this.displayGroupMessages(messages);
            }, 300);
        } catch (error) {
            console.error('Error loading group messages:', error);
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: #e74c3c;">Error loading messages</div>';
        }
    }

    displayGroupMessages(messages) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        if (messages.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: 40px; color: #667781;">Welcome to ${this.currentGroup.name}! Start the conversation.</div>`;
            return;
        }

        container.innerHTML = '';
        
        messages.forEach((msg, index) => {
            setTimeout(() => {
                const messageEl = document.createElement('div');
                messageEl.innerHTML = this.createGroupMessageHTML(msg);
                const messageNode = messageEl.firstChild;
                
                container.appendChild(messageNode);
                
                if (index === messages.length - 1) {
                    setTimeout(() => {
                        container.scrollTo({
                            top: container.scrollHeight,
                            behavior: 'smooth'
                        });
                    }, 100);
                }
            }, index * 30);
        });
    }

    createGroupMessageHTML(msg) {
        const isOwn = msg.sender_id === window.authManager.currentUser.id;
        const time = new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        
        const senderData = msg.sender || window.authManager.currentUser;
        const name = senderData.full_name || senderData.username;
        const profilePhoto = senderData.avatar_url || senderData.profile_photo;
        
        const avatarContent = profilePhoto ? 
            `<img src="${profilePhoto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` :
            this.escapeHtml((name || 'U').charAt(0).toUpperCase());
        
        return `<div class="message ${isOwn ? 'own' : ''}" data-message-id="${msg.id}">
               ${isOwn ? '' : `<div class="message-avatar">${avatarContent}</div>`}
               <div class="message-content">
               ${!isOwn ? `<div style="font-size: 12px; color: #10b981; font-weight: 600; margin-bottom: 2px;">${name}</div>` : ''}
               <div class="message-text">${this.escapeHtml(msg.text || '')}</div>
               <div class="message-time">${time}</div>
               </div></div>`;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async sendGroupMessage() {
        const input = document.getElementById('messageInput');
        if (!input) return;
        
        const text = input.value.trim();
        if (!text || !this.currentGroup) return;

        input.value = '';

        const tempMsg = {
            id: 'temp-' + Date.now(),
            group_id: this.currentGroup.id,
            sender_id: window.authManager.currentUser.id,
            text: text,
            created_at: new Date().toISOString()
        };

        this.addGroupMessageToUI(tempMsg);

        try {
            if (window.isNhostEnabled) {
                // Use Nhost GraphQL to insert message
                const { data: messageData, error } = await window.nhost.graphql.request(`
                    mutation InsertMessage($message: messages_insert_input!) {
                        insert_messages_one(object: $message) {
                            id
                            text
                            sender_id
                            created_at
                        }
                    }
                `, {
                    message: {
                        conversation_id: this.currentGroup.id,
                        sender_id: window.authManager.currentUser.id,
                        text: text,
                        message_type: 'text'
                    }
                });

                if (!error && messageData.data.insert_messages_one) {
                    const element = document.querySelector('[data-message-id="' + tempMsg.id + '"]');
                    if (element) element.setAttribute('data-message-id', messageData.data.insert_messages_one.id);
                }
            } else {
                // Local fallback - save to localStorage
                const localMessages = JSON.parse(localStorage.getItem(`group_messages_${this.currentGroup.id}`) || '[]');
                const newMessage = {
                    id: Date.now().toString(),
                    text: text,
                    sender_id: window.authManager.currentUser.id,
                    created_at: new Date().toISOString()
                };
                localMessages.push(newMessage);
                localStorage.setItem(`group_messages_${this.currentGroup.id}`, JSON.stringify(localMessages));
                
                const element = document.querySelector('[data-message-id="' + tempMsg.id + '"]');
                if (element) element.setAttribute('data-message-id', newMessage.id);
            }
        } catch (error) {
            console.error('Send group message error:', error);
            const element = document.querySelector('[data-message-id="' + tempMsg.id + '"]');
            if (element) element.remove();
            input.value = text;
        }
    }

    addGroupMessageToUI(msg) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        if (container.innerHTML.includes('Start the conversation')) {
            container.innerHTML = '';
        }

        if (document.querySelector('[data-message-id="' + msg.id + '"]')) return;

        const messageEl = document.createElement('div');
        messageEl.innerHTML = this.createGroupMessageHTML(msg);
        const messageNode = messageEl.firstChild;
        
        messageNode.style.opacity = '0';
        messageNode.style.transform = 'translateY(10px)';
        
        container.appendChild(messageNode);
        
        requestAnimationFrame(() => {
            messageNode.style.transition = 'all 0.3s ease-out';
            messageNode.style.transform = 'translateY(0)';
            messageNode.style.opacity = '1';
        });
        
        setTimeout(() => {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }

    startPolling() {
        if (this.pollInterval) clearInterval(this.pollInterval);
        
        this.pollInterval = setInterval(async () => {
            if (!this.currentGroup) return;
            
            try {
                let newMessages = [];
                
                if (window.isNhostEnabled) {
                    const { data: messagesData, error } = await window.nhost.graphql.request(`
                        query GetRecentGroupMessages($groupId: uuid!) {
                            messages(where: {conversation_id: {_eq: $groupId}}, order_by: {created_at: desc}, limit: 5) {
                                id
                                text
                                sender_id
                                created_at
                                users {
                                    id
                                    full_name
                                    username
                                    avatar_url
                                }
                            }
                        }
                    `, { groupId: this.currentGroup.id });
                    
                    if (!error && messagesData.data.messages) {
                        newMessages = messagesData.data.messages.map(msg => ({
                            id: msg.id,
                            text: msg.text,
                            sender_id: msg.sender_id,
                            created_at: msg.created_at,
                            sender: msg.users
                        }));
                    }
                } else {
                    // Local fallback
                    const localMessages = JSON.parse(localStorage.getItem(`group_messages_${this.currentGroup.id}`) || '[]');
                    newMessages = localMessages.slice(-5);
                }

                if (newMessages && newMessages.length > 0) {
                    newMessages.reverse().forEach(msg => {
                        if (!document.querySelector('[data-message-id="' + msg.id + '"]')) {
                            if (msg.sender_id !== window.authManager.currentUser.id) {
                                this.addGroupMessageToUI(msg);
                            }
                        }
                    });
                }
            } catch (error) {
                console.log('Group polling error:', error);
            }
        }, 1000);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    async showGroupMembers() {
        if (!this.currentGroup) return;
        
        try {
            let memberProfiles = [];
            
            if (window.isNhostEnabled) {
                // Use Nhost GraphQL to get group members
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
                `, { groupId: this.currentGroup.id });
                
                if (!error && membersData.data.group_members) {
                    memberProfiles = membersData.data.group_members.map(member => member.users);
                }
            } else {
                // Local fallback
                const localMembers = JSON.parse(localStorage.getItem(`group_members_${this.currentGroup.id}`) || '[]');
                const allUsers = JSON.parse(localStorage.getItem('businessconnect_all_users') || '[]');
                memberProfiles = localMembers.map(memberId => 
                    allUsers.find(user => user.id === memberId)
                ).filter(Boolean);
            }
            
            this.displayGroupMembersModal(memberProfiles);
            
        } catch (error) {
            console.error('Error loading group members:', error);
            window.authManager.showNotification('Failed to load group members: ' + error.message, 'error');
            
            // Show a simple modal with error info
            this.displayGroupMembersModal([]);
        }
    }
    
    displayGroupMembersModal(members) {
        const modal = document.createElement('div');
        modal.className = 'overlay';
        modal.innerHTML = `
            <div class="settings-modal" style="max-width: 500px; max-height: 90vh;">
                <div class="settings-header" style="background: #10b981; color: white;">
                    <h3><i class="fas fa-users"></i> ${this.currentGroup.name} Members</h3>
                    <button class="close-btn" onclick="this.closest('.overlay').remove()" style="color: white;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="settings-content" style="max-height: 70vh; overflow-y: auto;">
                    ${members.length === 0 ? `
                        <div style="text-align: center; padding: 40px 20px; color: #6b7280;">
                            <i class="fas fa-users" style="font-size: 48px; margin-bottom: 16px;"></i>
                            <h3>No Members Found</h3>
                            <p>This group has no members yet.</p>
                        </div>
                    ` : `
                        ${members.map(member => `
                            <div style="display: flex; align-items: center; gap: 16px; padding: 16px; background: #f8fafc; border-radius: 12px; margin-bottom: 12px; border-left: 4px solid #10b981;">
                                <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 18px; overflow: hidden;">
                                    ${member.profile_photo ? 
                                        `<img src="${member.profile_photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` :
                                        (member.full_name || member.username).charAt(0).toUpperCase()
                                    }
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                    <div style="font-weight: 600; font-size: 16px; color: #1f2937; margin-bottom: 4px;">${member.full_name || member.username}</div>
                                    <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">@${member.username}</div>
                                    ${member.job_title ? `<div style="color: #10b981; font-size: 12px; font-weight: 500;"><i class="fas fa-briefcase"></i> ${member.job_title}</div>` : ''}
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 8px;">
                                    ${member.id !== window.authManager.currentUser.id ? `
                                        <button onclick="window.authManager.checkMessageLockAndStart('${member.id}'); this.closest('.overlay').remove();" style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                                            <i class="fas fa-comment"></i> Message
                                        </button>
                                        <button onclick="window.groupChatManager.followMemberFromGroup('${member.id}')" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                                            <i class="fas fa-user-plus"></i> Follow
                                        </button>
                                    ` : `
                                        <div style="background: #f3f4f6; color: #6b7280; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 600;">
                                            <i class="fas fa-crown"></i> You
                                        </div>
                                    `}
                                </div>
                            </div>
                        `).join('')}
                    `}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    async followMemberFromGroup(userId) {
        try {
            if (window.isNhostEnabled) {
                const { error } = await window.nhost.graphql.request(`
                    mutation FollowUser($follower_id: uuid!, $following_id: uuid!) {
                        insert_followers_one(object: {follower_id: $follower_id, following_id: $following_id}) {
                            id
                        }
                    }
                `, {
                    follower_id: window.authManager.currentUser.id,
                    following_id: userId
                });
                
                if (error) {
                    if (error.message && error.message.includes('Uniqueness violation')) {
                        window.authManager.showNotification('You are already following this user', 'error');
                    } else {
                        throw error;
                    }
                    return;
                }
            } else {
                // Local fallback
                const localFollows = JSON.parse(localStorage.getItem('businessconnect_follows') || '[]');
                const existingFollow = localFollows.find(f => 
                    f.follower_id === window.authManager.currentUser.id && f.following_id === userId
                );
                
                if (existingFollow) {
                    window.authManager.showNotification('You are already following this user', 'error');
                    return;
                }
                
                localFollows.push({
                    id: Date.now().toString(),
                    follower_id: window.authManager.currentUser.id,
                    following_id: userId,
                    created_at: new Date().toISOString()
                });
                localStorage.setItem('businessconnect_follows', JSON.stringify(localFollows));
            }
            
            window.authManager.showNotification('User followed successfully!', 'success');
            
        } catch (error) {
            console.error('Follow error:', error);
            window.authManager.showNotification('Failed to follow user', 'error');
        }
    }
    
    // Add user to group and send notification
    async addUserToGroup(groupId, userId) {
        try {
            if (window.isNhostEnabled) {
                // Add user to group_members table using Nhost GraphQL
                const { error: memberError } = await window.nhost.graphql.request(`
                    mutation AddGroupMember($group_id: uuid!, $user_id: uuid!) {
                        insert_group_members_one(object: {group_id: $group_id, user_id: $user_id}) {
                            id
                        }
                    }
                `, {
                    group_id: groupId,
                    user_id: userId
                });
                
                if (memberError) {
                    if (memberError.message && memberError.message.includes('Uniqueness violation')) {
                        window.authManager.showNotification('User is already a member of this group', 'error');
                        return false;
                    }
                    throw memberError;
                }
            } else {
                // Local fallback
                const localMembers = JSON.parse(localStorage.getItem(`group_members_${groupId}`) || '[]');
                if (localMembers.includes(userId)) {
                    window.authManager.showNotification('User is already a member of this group', 'error');
                    return false;
                }
                localMembers.push(userId);
                localStorage.setItem(`group_members_${groupId}`, JSON.stringify(localMembers));
            }
            
            // Send notification to the added user (if notification system exists)
            if (window.groupNotificationManager) {
                await window.groupNotificationManager.notifyGroupAddition(
                    groupId, 
                    userId, 
                    window.authManager.currentUser.id
                );
                console.log('Group notification sent to user:', userId);
            }
            
            window.authManager.showNotification('User added to group successfully!', 'success');
            return true;
            
        } catch (error) {
            console.error('Error adding user to group:', error);
            window.authManager.showNotification('Failed to add user to group', 'error');
            return false;
        }
    }
    
    // Add user to channel and send notification  
    async addUserToChannel(channelId, userId) {
        try {
            if (window.isNhostEnabled) {
                // Add user to channel_members table using Nhost GraphQL
                const { error: memberError } = await window.nhost.graphql.request(`
                    mutation AddChannelMember($channel_id: uuid!, $user_id: uuid!) {
                        insert_channel_members_one(object: {channel_id: $channel_id, user_id: $user_id}) {
                            id
                        }
                    }
                `, {
                    channel_id: channelId,
                    user_id: userId
                });
                
                if (memberError) {
                    if (memberError.message && memberError.message.includes('Uniqueness violation')) {
                        window.authManager.showNotification('User is already a member of this channel', 'error');
                        return false;
                    }
                    throw memberError;
                }
            } else {
                // Local fallback
                const localMembers = JSON.parse(localStorage.getItem(`channel_members_${channelId}`) || '[]');
                if (localMembers.includes(userId)) {
                    window.authManager.showNotification('User is already a member of this channel', 'error');
                    return false;
                }
                localMembers.push(userId);
                localStorage.setItem(`channel_members_${channelId}`, JSON.stringify(localMembers));
            }
            
            // Send notification to the added user (if notification system exists)
            if (window.groupNotificationManager) {
                await window.groupNotificationManager.notifyChannelAddition(
                    channelId, 
                    userId, 
                    window.authManager.currentUser.id
                );
                console.log('Channel notification sent to user:', userId);
            }
            
            window.authManager.showNotification('User added to channel successfully!', 'success');
            return true;
            
        } catch (error) {
            console.error('Error adding user to channel:', error);
            window.authManager.showNotification('Failed to add user to channel', 'error');
            return false;
        }
    }
    
    // Open group chat
    async openGroup(groupId) {
        await this.startGroupChat(groupId);
    }
    
    // Open channel (similar to group but for channels)
    async openChannel(channelId) {
        // For now, channels work similar to groups
        // You can extend this for channel-specific functionality
        await this.startGroupChat(channelId);
    }
    
    // Create new group
    async createGroup(name, description = '', photoUrl = null) {
        try {
            if (window.isNhostEnabled) {
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
                        description: description,
                        photo_url: photoUrl,
                        created_by: window.authManager.currentUser.id
                    }
                });
                
                if (error) {
                    console.error('Nhost group creation error:', error);
                    throw error;
                }
                
                if (!groupData?.data?.insert_groups_one) {
                    throw new Error('No group data returned from Nhost');
                }
                
                const newGroup = groupData.data.insert_groups_one;
                
                // Add creator as first member
                await this.addUserToGroup(newGroup.id, window.authManager.currentUser.id);
                
                return newGroup;
            } else {
                // Local fallback
                const localGroups = JSON.parse(localStorage.getItem('businessconnect_groups') || '[]');
                const newGroup = {
                    id: Date.now().toString(),
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
        } catch (error) {
            console.error('Error creating group:', error);
            throw error;
        }
    }
    
    // Create new channel
    async createChannel(name, description = '', photoUrl = null) {
        try {
            if (window.isNhostEnabled) {
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
                        description: description,
                        photo_url: photoUrl,
                        created_by: window.authManager.currentUser.id
                    }
                });
                
                if (error) {
                    console.error('Nhost channel creation error:', error);
                    throw error;
                }
                
                if (!channelData?.data?.insert_channels_one) {
                    throw new Error('No channel data returned from Nhost');
                }
                
                const newChannel = channelData.data.insert_channels_one;
                
                // Add creator as first member
                await this.addUserToChannel(newChannel.id, window.authManager.currentUser.id);
                
                return newChannel;
            } else {
                // Local fallback
                const localChannels = JSON.parse(localStorage.getItem('businessconnect_channels') || '[]');
                const newChannel = {
                    id: Date.now().toString(),
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
        } catch (error) {
            console.error('Error creating channel:', error);
            throw error;
        }
    }

    cleanup() {
        this.stopPolling();
        this.currentGroup = null;
        
        const chatTitle = document.getElementById('chatTitle');
        const chatStatus = document.getElementById('chatStatus');
        const backBtn = document.getElementById('backBtn');
        
        if (chatTitle) {
            chatTitle.textContent = 'BusinessConnect';
            chatTitle.style.cursor = 'default';
            chatTitle.style.textDecoration = 'none';
            chatTitle.title = '';
            chatTitle.onclick = null;
        }
        if (chatStatus) chatStatus.innerHTML = '';
        if (backBtn) backBtn.style.display = 'none';
    }
}

// Initialize group chat manager
window.groupChatManager = new GroupChatManager();

console.log('Group Chat Manager loaded');