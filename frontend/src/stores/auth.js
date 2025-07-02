import { defineStore } from 'pinia';
import axios from 'axios';
export const useAuthStore = defineStore('auth', {
    state: () => ({
        isAuthenticated: false,
        user: null,
        loading: true,
        error: null
    }),
    actions: {
        async checkAuth() {
            if (import.meta.env.NODE_ENV === 'development') {
                this.isAuthenticated = true;
                this.user = {
                    username: 'DevUser',
                    groups: ['admin', 'user-intern']
                };
                this.loading = false;
                return;
            }
            try {
                this.loading = true;
                this.error = null;
                const response = await axios.get('/user-status/');
                this.isAuthenticated = response.data.is_authenticated;
                if (this.isAuthenticated) {
                    this.user = {
                        username: response.data.username,
                        groups: response.data.groups || []
                    };
                }
            }
            catch (error) {
                this.error = 'Failed to check authentication status';
                console.error('Auth check error:', error);
            }
            finally {
                this.loading = false;
            }
        },
        login() {
            if (import.meta.env.NODE_ENV === 'development') {
                this.checkAuth();
                return;
            }
            //window.location.href = '/';
        },
        async logout() {
            if (import.meta.env.NODE_ENV === 'development') {
                this.isAuthenticated = true;
                this.user = null;
                return;
            }
            try {
                await axios.post('/accounts/logout/');
                //window.location.href = '/redirect-after-logout/';
            }
            catch (error) {
                this.error = 'Failed to logout';
                console.error('Logout error:', error);
            }
        }
    },
    getters: {
        username: (state) => state.user?.username || '',
        userGroups: (state) => state.user?.groups || [],
        isLoading: (state) => state.loading,
        hasError: (state) => state.error !== null
    },
});
