import axiosInstance, { endoregApi, silentRequestConfig } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'

export type MonitoringStatus = 'ok' | 'warning' | 'error' | 'unknown'
export type MonitoringValue =
  string | number | boolean | null | MonitoringValue[] | { [key: string]: MonitoringValue }
export interface MonitoringCheck {
  key: string
  status: MonitoringStatus
  summary: string
  detail: string | null
  observedAt: string
  metadata: Record<string, MonitoringValue>
}
export interface MonitoringSnapshot {
  schemaVersion: 1
  status: Exclude<MonitoringStatus, 'unknown'>
  observedAt: string
  version: string | null
  checks: MonitoringCheck[]
}
export async function fetchMonitoringSnapshot(): Promise<MonitoringSnapshot> {
  const { data } = await axiosInstance.get<MonitoringSnapshot>(
    endoregApi(endpoints.administration.monitoring),
    silentRequestConfig({ timeout: 15000 })
  )
  return data
}
