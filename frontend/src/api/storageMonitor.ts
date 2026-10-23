import api, { endoregApi } from '@/api/axiosInstance'

export interface StorageEntry {
  id: string
  kind: 'video' | 'report' | 'artifact' | 'upload'
  name: string
  status: string
  path: string
  size: number | null
  modified: string
  owners: string[]
  details: Record<string, string>
  token: string
  blocker: string
}
export interface StorageInventory {
  items: StorageEntry[]
  total: number
  bytes: number
  states: string[]
  administrator: boolean
}
const endpoint = endoregApi('media/storage-monitor/')
export async function fetch_inventory(
  params: { search: string; kind: string; state: string; offset: number; limit: number },
  signal?: AbortSignal
): Promise<StorageInventory> {
  return (await api.get<StorageInventory>(endpoint, { params, signal })).data
}
export async function delete_entry(token: string): Promise<void> {
  await api.delete(endpoint, { data: { token } })
}
