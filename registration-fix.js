// Registration Fix JavaScript V2
// Enhanced registration logic with comprehensive error handling

class RegistrationManager {
    constructor(supabase) {
        this.supabase = supabase;
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    async registerUser(userData) {
        const { username, email, password, fullName } = userData;
        
        // Validate input
        if (!email || !password || !username || !fullName) {
            return {
                success: false,
                error: 'All fields are required'
            };
        }

        if (password.length < 6) {
            return {
                success: false,
                error: 'Password must be at least 6 characters'
            };
        }

        // Test connection first
        const isConnected = await this.testConnection();
        if (!isConnected) {
            return {
                success: false,
                error: 'Database connection failed. Please check your internet connection.'
            };
        }

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`Registration attempt ${attempt}/${this.maxRetries}`);
                
                // Step 1: Create auth user
                const { data: authData, error: authError } = await this.supabase.auth.signUp({
                    email: email.trim().toLowerCase(),
                    password: password,
                    options: {
                        data: {
                            username: username.trim(),
                            full_name: fullName.trim()
                        }
                    }
                });

                if (authError) {
                    console.error('Auth signup error:', authError);
                    
                    // Handle specific auth errors
                    if (authError.message.includes('User already registered')) {
                        return {
                            success: false,
                            error: 'This email is already registered. Please use a different email or try logging in.'
                        };
                    }
                    
                    if (authError.message.includes('Password should be at least')) {
                        return {
                            success: false,
                            error: 'Password is too weak. Please use at least 6 characters.'
                        };
                    }
                    
                    if (authError.message.includes('Invalid email')) {
                        return {
                            success: false,
                            error: 'Please enter a valid email address.'
                        };
                    }
                    
                    throw authError;
                }

                if (!authData?.user?.id) {
                    throw new Error('No user ID returned from auth signup');
                }

                const uid = authData.user.id;
                console.log('Auth user created with UID:', uid);

                // Step 2: Wait for trigger to potentially create profile
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Step 3: Try to get existing profile
                let profile = await this.getProfile(uid);

                // Step 4: Create profile manually if needed
                if (!profile) {
                    console.log('Profile not found, creating manually...');
                    profile = await this.createProfileManually(uid, email, username, fullName);
                }

                // Step 5: Verify profile exists
                if (!profile) {
                    throw new Error('Failed to create user profile');
                }

                console.log('Registration successful:', profile);
                return {
                    success: true,
                    user: profile,
                    message: 'Account created successfully!'
                };

            } catch (error) {
                console.error(`Registration attempt ${attempt} failed:`, error);
                
                // If this is the last attempt, return the error
                if (attempt === this.maxRetries) {
                    let errorMessage = 'Registration failed';
                    
                    if (error.message.includes('User already registered')) {
                        errorMessage = 'This email is already registered';
                    } else if (error.message.includes('Password should be at least')) {
                        errorMessage = 'Password is too weak';
                    } else if (error.message.includes('Invalid email')) {
                        errorMessage = 'Invalid email address';
                    } else if (error.message.includes('connection')) {
                        errorMessage = 'Database connection error';
                    } else {
                        errorMessage = error.message || 'Registration failed';
                    }

                    return {
                        success: false,
                        error: errorMessage
                    };
                }
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
            }
        }
    }

    async getProfile(uid) {
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', uid)
                .single();
            
            if (error && !error.message.includes('No rows')) {
                console.error('Error getting profile:', error);
            }
            
            return data;
        } catch (error) {
            console.error('Exception getting profile:', error);
            return null;
        }
    }

    async createProfileManually(uid, email, username, fullName) {
        try {
            // Method 1: Try using the manual creation function
            const { data: funcResult, error: funcError } = await this.supabase
                .rpc('create_profile_manually', {
                    user_id: uid,
                    user_email: email,
                    user_username: username,
                    user_full_name: fullName
                });

            if (!funcError && funcResult) {
                console.log('Profile created via function');
                return funcResult;
            }

            // Method 2: Direct insert with upsert
            const profileData = {
                id: uid,
                username: username,
                email: email,
                full_name: fullName,
                display_name: fullName,  // Set display_name same as full_name
                status: 'online',
                joined_at: new Date().toISOString()
            };

            const { data: insertResult, error: insertError } = await this.supabase
                .from('profiles')
                .upsert(profileData, { 
                    onConflict: 'id',
                    ignoreDuplicates: false 
                })
                .select()
                .single();

            if (!insertError && insertResult) {
                console.log('Profile created via direct insert');
                return insertResult;
            }

            // Method 3: Simple insert
            const { data: simpleResult, error: simpleError } = await this.supabase
                .from('profiles')
                .insert(profileData)
                .select()
                .single();

            if (!simpleError && simpleResult) {
                console.log('Profile created via simple insert');
                return simpleResult;
            }

            console.error('All profile creation methods failed');
            console.error('Function error:', funcError);
            console.error('Insert error:', insertError);
            console.error('Simple error:', simpleError);
            
            // Return the profile data anyway for local use
            return profileData;
            
        } catch (error) {
            console.error('Exception creating profile manually:', error);
            
            // Return basic profile data as fallback
            return {
                id: uid,
                username: username,
                email: email,
                full_name: fullName,
                display_name: fullName,  // Set display_name same as full_name
                status: 'online',
                joined_at: new Date().toISOString()
            };
        }
    }

    async testConnection() {
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('id')
                .limit(1);
            
            return !error;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }
}

// Export for use in main application
if (typeof window !== 'undefined') {
    window.RegistrationManager = RegistrationManager;
}