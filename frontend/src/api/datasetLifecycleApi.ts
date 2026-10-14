import axios, { r } from '@/api/axiosInstance'

export interface Dataset {
  id: number
  name: string
  description: string
  modality: 'clinical' | 'image' | 'video'
  active: boolean
  owner: number | null
  system: boolean
  examinations: number
  images: number
  segments: number
  videos: number
  patients?: { id: number; examinations: number[]; videos: number[] }[]
}

export interface DeletionPreview {
  preview: string
  examinations: number[]
  images: number[]
  segments: number[]
  videos: number[]
  studies: number[]
  removable: number[]
  retained: { id: number; reason: string }[]
}

const path = 'media/studies/datasets/'
export async function list_datasets(): Promise<Dataset[]> {
  return (await axios.get<Dataset[]>(r(path))).data
}
export async function read_dataset(id: number): Promise<Dataset> {
  return (await axios.get<Dataset>(r(`${path}${String(id)}/`), { params: { members: true } })).data
}
export async function create_dataset(name: string, description: string): Promise<Dataset> {
  return (await axios.post<Dataset>(r(path), { name, description, dataset_type: 'clinical' })).data
}
export async function update_dataset(
  id: number,
  name: string,
  description: string,
  active: boolean
): Promise<Dataset> {
  return (
    await axios.put<Dataset>(r(`${path}${String(id)}/`), { name, description, is_active: active })
  ).data
}
export async function combine_datasets(sources: number[], name: string): Promise<Dataset> {
  return (await axios.post<Dataset>(r(`${path}combine/`), { sources, name })).data
}
export async function split_dataset(
  id: number,
  partitions: { name: string; patients: number[] }[]
): Promise<Dataset[]> {
  return (await axios.post<Dataset[]>(r(`${path}${String(id)}/split/`), { partitions })).data
}
export async function preview_deletion(id: number): Promise<DeletionPreview> {
  return (await axios.get<DeletionPreview>(r(`${path}${String(id)}/deletion-preview/`))).data
}
export async function delete_dataset(
  id: number,
  preview: string,
  mode: 'memberships_only' | 'exclusive_imported_records'
): Promise<{ deleted: number[] }> {
  return (
    await axios.delete<{ deleted: number[] }>(r(`${path}${String(id)}/`), {
      data: { preview, mode }
    })
  ).data
}
export async function delete_study(id: number): Promise<void> {
  await axios.delete(r(`media/studies/cohorts/${String(id)}/`))
}
