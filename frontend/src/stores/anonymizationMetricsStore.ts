import { defineStore } from 'pinia'
import {
  fetchAnonymizationMetrics,
  type AnonymizationMetricsFilters,
  type AnonymizationMetricsResponse
} from '@/api/anonymizationMetricsApi'

export interface AnonymizationMetricsState {
  data: AnonymizationMetricsResponse | null
  filters: AnonymizationMetricsFilters
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

export function formatDateForMetricsInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildDefaultAnonymizationMetricsFilters(
  now = new Date()
): AnonymizationMetricsFilters {
  const dateTo = new Date(now)
  const dateFrom = new Date(now)
  dateFrom.setDate(dateFrom.getDate() - 30)

  return {
    dateFrom: formatDateForMetricsInput(dateFrom),
    dateTo: formatDateForMetricsInput(dateTo),
    mediaType: 'all',
    centerId: '',
    documentType: '',
    sourceSystem: ''
  }
}

function errorToMessage(error: any): string {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.error ||
    error?.message ||
    'Anonymisierungsmetriken konnten nicht geladen werden.'
  )
}

export const useAnonymizationMetricsStore = defineStore('anonymizationMetrics', {
  state: (): AnonymizationMetricsState => ({
    data: null,
    filters: buildDefaultAnonymizationMetricsFilters(),
    loading: false,
    error: null,
    lastUpdated: null
  }),

  actions: {
    async fetchMetrics(customFilters?: Partial<AnonymizationMetricsFilters>) {
      if (customFilters) {
        this.filters = {
          ...this.filters,
          ...customFilters
        }
      }

      this.loading = true
      this.error = null

      try {
        const data = await fetchAnonymizationMetrics(this.filters)
        this.data = data
        this.lastUpdated = new Date()
        return data
      } catch (error: any) {
        this.data = null
        this.error = errorToMessage(error)
        return null
      } finally {
        this.loading = false
      }
    },

    async updateFilters(filters: Partial<AnonymizationMetricsFilters>) {
      this.filters = {
        ...this.filters,
        ...filters
      }
      return this.fetchMetrics()
    },

    resetFilters() {
      this.filters = buildDefaultAnonymizationMetricsFilters()
    }
  }
})
