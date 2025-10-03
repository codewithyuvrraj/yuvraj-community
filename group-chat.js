// Group Chat Manager - Instant Messaging for Groups
class GroupChatManager {
    constructor() {
        this.currentGroup = null;
        this.pollInterval = null;
    }

    async startGroupChat(groupId) {
        if (!window.authManager || !window.authManager.currentUser) return;

        try {
            // Get group details with proper name
            const { data: group, error } = await window.supabase
                .from('groups')
                .select('*')
                .eq('id', groupId)
                .single();

            if (error) throw error;

            this.currentGroup = {
                id: groupId,
                name: group.name,
                description: group.description,
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
            chatTitle.textContent = this.currentGroup.name;
            chatTitle.style.cursor = 'pointer';
            chatTitle.onclick = () => this.showGroupMembers();
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
            const { data } = await window.supabase
                .from('group_messages')
                .select('*')
                .eq('group_id', this.currentGroup.id)
                .order('created_at', { ascending: true });
            
            // Get sender info separately for each message
            if (data && data.length > 0) {
                for (let msg of data) {
                    if (msg.sender_id !== window.authManager.currentUser.id) {
                        const { data: senderData } = await window.supabase
                            .from('profiles')
                            .select('id, full_name, username, profile_photo')
                            .eq('id', msg.sender_id)
                            .single();
                        msg.sender = senderData;
                    }
                }
            }

            setTimeout(() => {
                this.displayGroupMessages(data || []);
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
        const profilePhoto = senderData.profile_photo;
        
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
            const { data, error } = await window.supabase
                .from('group_messages')
                .insert({
                    group_id: this.currentGroup.id,
                    sender_id: window.authManager.currentUser.id,
                    text: text
                })
                .select()
                .single();

            if (!error && data) {
                const element = document.querySelector('[data-message-id="' + tempMsg.id + '"]');
                if (element) element.setAttribute('data-message-id', data.id);
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
                const { data } = await window.supabase
                    .from('group_messages')
                    .select('*')
                    .eq('group_id', this.currentGroup.id)
                    .order('created_at', { ascending: false })
                    .limit(5);
                
                // Get sender info for new messages
                if (data && data.length > 0) {
                    for (let msg of data) {
                        if (msg.sender_id !== window.authManager.currentUser.id) {
                            const { data: senderData } = await window.supabase
                                .from('profiles')
                                .select('id, full_name, username, profile_photo')
                                .eq('id', msg.sender_id)
                                .single();
                            msg.sender = senderData;
                        }
                    }
                }

                if (data && data.length > 0) {
                    data.reverse().forEach(msg => {
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
            // Get group members
            const { data: members, error } = await window.supabase
                .from('group_members')
                .select('user_id')
                .eq('group_id', this.currentGroup.id);
            
            if (error) throw error;
            
            // Get member profiles
            const memberProfiles = [];
            for (let member of members || []) {
                const { data: profile } = await window.supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', member.user_id)
                    .single();
                if (profile) memberProfiles.push(profile);
            }
            
            this.displayGroupMembersModal(memberProfiles);
            
        } catch (error) {
            console.error('Error loading group members:', error);
            window.authManager.showNotification('Failed to load group members', 'error');
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
            if (window.isSupabaseEnabled) {
                const { error } = await window.supabase
                    .from('follows')
                    .insert({
                        follower_id: window.authManager.currentUser.id,
                        following_id: userId
                    });
                
                if (error) {
                    if (error.code === '23505') {
                        window.authManager.showNotification('You are already following this user', 'error');
                    } else {
                        throw error;
                    }
                    return;
                }
            }
            
            window.authManager.showNotification('User followed successfully!', 'success');
            
        } catch (error) {
            console.error('Follow error:', error);
            window.authManager.showNotification('Failed to follow user', 'error');
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
            chatTitle.onclick = null;
        }
        if (chatStatus) chatStatus.innerHTML = '';
        if (backBtn) backBtn.style.display = 'none';
    }
}

// Initialize group chat manager
window.groupChatManager = new GroupChatManager();

console.log('Group Chat Manager loaded');