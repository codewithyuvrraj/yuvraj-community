// Nhost auth debug and fix
console.log('Nhost Auth Debug Script Loaded');

// Override the auth functions with Nhost versions
window.addEventListener('load', () => {
    if (window.authManager && window.nhost) {
        console.log('Overriding auth functions with Nhost versions');
        
        // Simple login function
        window.authManager.handleLogin = async function(e) {
            e.preventDefault();
            this.setLoading('login', true);

            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;

            try {
                console.log('Attempting Nhost login for:', email);
                
                const { session, error } = await window.nhost.auth.signIn({
                    email: email,
                    password: password
                });

                if (error) throw error;

                const uid = session.user.id;
                console.log('Nhost auth successful, UID:', uid);

                // Get profile from users table
                const { data: profile, error: profileError } = await window.nhost.graphql.request(`
                    query GetUser($id: uuid!) {
                        users_by_pk(id: $id) {
                            id
                            username
                            full_name
                            email
                            avatar_url
                            bio
                            created_at
                            updated_at
                            is_active
                        }
                    }
                `, { id: uid });

                if (profileError || !profile.data.users_by_pk) {
                    throw new Error('Profile not found in users table');
                }

                this.currentUser = profile.data.users_by_pk;
                localStorage.setItem('businessconnect_current_user', JSON.stringify(this.currentUser));
                
                this.showNotification('Login successful!', 'success');
                setTimeout(() => this.showApp(), 500);

            } catch (error) {
                console.error('Login error:', error);
                let errorMessage = 'Login failed';
                if (error.message.includes('Invalid login credentials')) {
                    errorMessage = 'Invalid email or password';
                } else if (error.message.includes('Email not confirmed')) {
                    errorMessage = 'Please confirm your email address';
                } else {
                    errorMessage = error.message || 'Login failed';
                }
                this.showNotification(errorMessage, 'error');
            } finally {
                this.setLoading('login', false);
            }
        };

        // Simple register function
        window.authManager.handleRegister = async function(e) {
            e.preventDefault();
            this.setLoading('register', true);

            const email = document.getElementById('registerEmail').value.trim().toLowerCase();
            const password = document.getElementById('registerPassword').value;
            const username = document.getElementById('registerUsername').value.trim();
            const fullName = document.getElementById('registerFullName').value.trim();

            // Client-side validation
            if (!username || !email || !password || !fullName) {
                this.showNotification('All fields are required', 'error');
                this.setLoading('register', false);
                return;
            }

            if (password.length < 6) {
                this.showNotification('Password must be at least 6 characters', 'error');
                this.setLoading('register', false);
                return;
            }

            try {
                console.log('Attempting Nhost registration for:', email);

                // Register with Nhost Auth
                const { session, error: authError } = await window.nhost.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        displayName: fullName
                    }
                });
                
                if (authError) {
                    throw new Error(authError.message);
                }
                
                // Create user profile in users table
                const { data: userData, error: userError } = await window.nhost.graphql.request(`
                    mutation InsertUser($user: users_insert_input!) {
                        insert_users_one(object: $user) {
                            id
                            username
                            full_name
                            email
                            avatar_url
                            bio
                            created_at
                            updated_at
                            is_active
                        }
                    }
                `, {
                    user: {
                        id: session.user.id,
                        username: username,
                        full_name: fullName,
                        email: email,
                        password_hash: 'managed_by_nhost',
                        is_active: true
                    }
                });
                
                if (userError) {
                    throw new Error(userError.message);
                }
                
                this.currentUser = userData.data.insert_users_one;
                localStorage.setItem('businessconnect_current_user', JSON.stringify(this.currentUser));
                
                this.showNotification('Account created successfully!', 'success');
                setTimeout(() => this.showApp(), 1000);

            } catch (error) {
                console.error('Registration error:', error);
                let message = 'Registration failed';
                if (error.message.includes('already exists') || error.message.includes('already registered')) {
                    message = 'Email already exists';
                } else if (error.message) {
                    message = error.message;
                }
                this.showNotification(message, 'error');
            } finally {
                this.setLoading('register', false);
            }
        };

        console.log('Auth functions overridden with Nhost versions');
    } else {
        console.log('AuthManager or Nhost not available, skipping override');
    }
});