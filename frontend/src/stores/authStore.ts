import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface User {
  id: string
  username: string
  email: string
  firstName?: string
  lastName?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = computed(() => user.value !== null)

  function setUser(userData: User) {
    user.value = userData
  }

  function logout() {
    user.value = null
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
      }
    }
  }

  return {
    user,
    isAuthenticated,
    setUser,
    logout,
    initMockUser
  }
})
