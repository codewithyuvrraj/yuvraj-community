// Simple auth debug and fix
console.log('Auth Debug Script Loaded');

// Override the auth functions with simpler versions
window.addEventListener('load', () => {
    if (window.authManager) {
        // Backup original methods
        const originalHandleLogin = window.authManager.handleLogin;
        const originalHandleRegister = window.authManager.handleRegister;

        // Simple login function
        window.authManager.handleLogin = async function(e) {
            e.preventDefault();
            this.setLoading('login', true);

            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;

            try {
                console.log('Attempting login for:', email);
                
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) throw error;

                // Get profile
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                if (profileError) throw new Error('Profile not found');

                this.currentUser = profile;
                localStorage.setItem('businessconnect_current_user', JSON.stringify(profile));
                
                this.showNotification('Login successful!', 'success');
                setTimeout(() => this.showApp(), 500);

            } catch (error) {
                console.error('Login error:', error);
                this.showNotification(error.message || 'Login failed', 'error');
            } finally {
                this.setLoading('login', false);
            }
        };

        // Simple register function
        window.authManager.handleRegister = async function(e) {
            e.preventDefault();
            this.setLoading('register', true);

            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;
            const username = document.getElementById('registerUsername').value.trim();
            const fullName = document.getElementById('registerFullName').value.trim();

            try {
                console.log('Attempting registration for:', email);

                // Create auth user
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password
                });

                if (error) throw error;

                // Create profile
                const profile = {
                    id: data.user.id,
                    email: email,
                    username: username,
                    full_name: fullName,
                    created_at: new Date().toISOString()
                };

                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert(profile);

                if (profileError) {
                    console.error('Profile creation error:', profileError);
                    // Continue anyway
                }

                this.currentUser = profile;
                localStorage.setItem('businessconnect_current_user', JSON.stringify(profile));
                
                this.showNotification('Account created successfully!', 'success');
                setTimeout(() => this.showApp(), 1000);

            } catch (error) {
                console.error('Registration error:', error);
                let message = 'Registration failed';
                if (error.message.includes('already registered')) {
                    message = 'Email already exists';
                }
                this.showNotification(message, 'error');
            } finally {
                this.setLoading('register', false);
            }
        };

        console.log('Auth functions overridden with simpler versions');
    }
});