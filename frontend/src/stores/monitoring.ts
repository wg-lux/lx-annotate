import { defineStore } from 'pinia'
import { isAxiosError } from 'axios'
import { fetchMonitoringSnapshot, type MonitoringSnapshot } from '@/api/monitoringApi'

export const useMonitoringStore = defineStore('runtime_monitoring', {
  state: () => ({
    snapshot: null as MonitoringSnapshot | null,
    loading: false,
    forbidden: false,
    error: '',
    requestId: 0
  }),
  actions: {
    clear(): void {
      this.requestId += 1
      this.snapshot = null
      this.loading = false
      this.error = ''
      this.forbidden = false
    },
    async refresh(): Promise<void> {
      if (this.loading) return
      const requestId = ++this.requestId
      this.loading = true
      this.error = ''
      this.forbidden = false
      // A failed refresh must never leave a previous green snapshot on screen.
      this.snapshot = null
      try {
        const snapshot = await fetchMonitoringSnapshot()
        if (requestId === this.requestId) this.snapshot = snapshot
      } catch (error: unknown) {
        if (requestId !== this.requestId) return
        this.forbidden =
          isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)
        this.error = this.forbidden
          ? 'Administrator access is required.'
          : 'Monitoring could not be refreshed. Application health is unknown.'
      } finally {
        if (requestId === this.requestId) this.loading = false
      }
    }
  }
})
