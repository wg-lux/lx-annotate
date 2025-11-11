import { defineStore } from 'pinia'
import axios from 'axios'

type Caps = Record<string, { read: boolean; write: boolean }>

export const useAuthKcStore = defineStore('auth_kc', {
  state: () => ({
    initialized: false,
    isAuthenticated: true,   // session-based: assume true after page load
    roles: [] as string[],
    capabilities: {} as Caps
  }),
  getters: {
    can: (state) => (capOrRoute: string, method: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE'='GET') => {
      const cap = state.capabilities[capOrRoute]
      if (!cap) return true
      return method === 'GET' ? !!cap.read : !!cap.write
    }
  },
  actions: {
    async initOnce() {
      if (this.initialized) return
      this.initialized = true
      try {
        const res = await axios.get('/api/auth/context', { withCredentials: true })
        const data = res.data || {}
        this.roles = Array.isArray(data.roles) ? data.roles : []
        this.capabilities = data.capabilities || {}
        this.isAuthenticated = true
      } catch {
        this.isAuthenticated = true
      }
    }
  }
})
