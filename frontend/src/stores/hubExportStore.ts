import { defineStore } from 'pinia'
import axiosInstance from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'

export interface HubNodeSummary {
  nodeKey: string
  displayName: string
  baseUrl: string
  owningCenterKey: string | null
}

export interface HubExportItem {
  id: number
  resourceKind: 'video' | 'report'
  filename: string
  anonymizationStatus: string
  processedMediaPresent: boolean
  sourceCenterKey: string | null
  sourceCenterName: string | null
  markedForUpload: boolean
  outboundStatus: string
  lastError: string
  lastTransferTimestamp: string | null
  targetNodeKey: string | null
  eligible: boolean
  createdAt: string | null
}

export interface HubExportOverviewResponse {
  selectedTargetNodeKey: string | null
  sourceNodeKey: string | null
  hubNodes: HubNodeSummary[]
  configReady: boolean
  configError: string
  items: HubExportItem[]
}

export const useHubExportStore = defineStore('hubExport', {
  state: () => ({
    loading: false,
    error: null as string | null,
    selectedTargetNodeKey: null as string | null,
    sourceNodeKey: null as string | null,
    hubNodes: [] as HubNodeSummary[],
    items: [] as HubExportItem[],
    configReady: false,
    configError: ''
  }),
  getters: {
    eligibleItems: (state) => state.items.filter((item) => item.eligible),
    markedItems: (state) => state.items.filter((item) => item.markedForUpload)
  },
  actions: {
    async fetchOverview(targetNodeKey?: string | null) {
      this.loading = true
      this.error = null
      try {
        const params = targetNodeKey ? { target_node_key: targetNodeKey } : undefined
        const { data } = await axiosInstance.get<HubExportOverviewResponse>(`/api/${endpoints.hubExport.overview}`, { params })
        this.selectedTargetNodeKey = data.selectedTargetNodeKey
        this.sourceNodeKey = data.sourceNodeKey
        this.hubNodes = data.hubNodes
        this.items = data.items
        this.configReady = data.configReady
        this.configError = data.configError
        return data
      } catch (error: any) {
        this.error = error?.response?.data?.detail || error?.message || 'Fehler beim Laden der Hub-Export-Übersicht.'
        throw error
      } finally {
        this.loading = false
      }
    },
    async markResources(resources: Array<{ id: number; resourceKind: 'video' | 'report' }>) {
      if (!this.selectedTargetNodeKey) {
        throw new Error('Kein Hub-Ziel ausgewählt.')
      }
      await axiosInstance.post(`/api/${endpoints.hubExport.mark}`, {
        targetNodeKey: this.selectedTargetNodeKey,
        resources
      })
      await this.fetchOverview(this.selectedTargetNodeKey)
    },
    async unmarkResources(resources: Array<{ id: number; resourceKind: 'video' | 'report' }>) {
      if (!this.selectedTargetNodeKey) {
        throw new Error('Kein Hub-Ziel ausgewählt.')
      }
      await axiosInstance.post(`/api/${endpoints.hubExport.unmark}`, {
        targetNodeKey: this.selectedTargetNodeKey,
        resources
      })
      await this.fetchOverview(this.selectedTargetNodeKey)
    }
  }
})
