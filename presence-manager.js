class PresenceManager {
    constructor() {
        this.heartbeatInterval = null;
        this.isActive = true;
        this.lastActivity = Date.now();
        this.setupActivityTracking();
    }

    async setOnline(userId) {
        if (!isSupabaseEnabled || !userId) return;
        
        try {
            await supabase.rpc('update_user_presence', {
                user_id: userId,
                is_online: true
            });
            
            this.startHeartbeat(userId);
        } catch (error) {
            console.error('Error setting online:', error);
        }
    }

    async setOffline(userId) {
        if (!isSupabaseEnabled || !userId) return;
        
        try {
            await supabase.rpc('update_user_presence', {
                user_id: userId,
                is_online: false
            });
            
            this.stopHeartbeat();
        } catch (error) {
            console.error('Error setting offline:', error);
        }
    }

    startHeartbeat(userId) {
        this.stopHeartbeat();
        
        this.heartbeatInterval = setInterval(async () => {
            if (this.isActive && Date.now() - this.lastActivity < 120000) { // 2 minutes
                try {
                    await supabase.rpc('update_user_presence', {
                        user_id: userId,
                        is_online: true
                    });
                } catch (error) {
                    console.error('Heartbeat error:', error);
                }
            }
        }, 30000); // Every 30 seconds
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    setupActivityTracking() {
        const updateActivity = () => {
            this.lastActivity = Date.now();
            this.isActive = true;
        };

        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });

        // Handle page visibility
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.isActive = false;
            } else {
                updateActivity();
                if (window.authManager?.currentUser) {
                    this.setOnline(window.authManager.currentUser.id);
                }
            }
        });

        // Handle page unload
        window.addEventListener('beforeunload', () => {
            if (window.authManager?.currentUser) {
                navigator.sendBeacon('/api/offline', JSON.stringify({
                    userId: window.authManager.currentUser.id
                }));
            }
        });
    }

    async getUserStatus(userId) {
        if (!isSupabaseEnabled || !userId) return { status_text: 'Offline', is_online: false };
        
        try {
            const { data, error } = await supabase.rpc('get_user_status', {
                user_id: userId
            });
            
            if (error) throw error;
            return data[0] || { status_text: 'Offline', is_online: false };
        } catch (error) {
            console.error('Error getting user status:', error);
            return { status_text: 'Offline', is_online: false };
        }
    }

    getStatusColor(status) {
        switch (status?.status_text) {
            case 'Online': return '#22c55e';
            case 'Active': return '#f59e0b';
            case 'Recently active': return '#f59e0b';
            default: return '#ef4444';
        }
    }

    getStatusIndicator(status) {
        const color = this.getStatusColor(status);
        return `<div class="status-indicator" style="width: 12px; height: 12px; border-radius: 50%; background: ${color}; border: 2px solid white; position: absolute; bottom: 0; right: 0;"></div>`;
    }
}

// Initialize presence manager
window.presenceManager = new PresenceManager();