import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
export const useAuthStore = defineStore('auth', () => {
    const user = ref(null);
    const isAuthenticated = computed(() => user.value !== null);
    function setUser(userData) {
        user.value = userData;
    }
    function logout() {
        user.value = null;
    }
    // Mock user for development - in production this would be set via login
    function initMockUser() {
        if (!user.value) {
            user.value = {
                id: 'user-1',
                username: 'doctor',
                email: 'doctor@hospital.com',
                firstName: 'Dr.',
                lastName: 'Smith'
            };
        }
    }
    return {
        user,
        isAuthenticated,
        setUser,
        logout,
        initMockUser
    };
});
