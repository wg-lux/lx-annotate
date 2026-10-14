import axios, { r } from '@/api/axiosInstance'

export interface TableMappingOption {
  id: string
  name: string
}

export interface TableImportOptions {
  template: string
  mappings: TableMappingOption[]
  centers: { id: number; name: string }[]
}

export interface TableImportResult {
  rows: number
  created: number
  replayed: number
  videos: number
  reports: number
}

const mapping_path = 'media/studies/table-mappings/'

export async function list_table_mappings(): Promise<TableImportOptions> {
  return (await axios.get<TableImportOptions>(r(mapping_path))).data
}

export async function save_table_mapping(yaml: string): Promise<TableMappingOption> {
  return (await axios.post<TableMappingOption>(r(mapping_path), { yaml })).data
}

export async function read_table_mapping(id: string): Promise<string> {
  return (await axios.get<{ yaml: string }>(r(`${mapping_path}${id}/`))).data.yaml
}

export async function import_study_table(
  cohort_id: number,
  mapping_id: string,
  center_id: number,
  file: File,
  mode: 'validate' | 'import'
): Promise<TableImportResult> {
  const form = new FormData()
  form.append('mapping_id', mapping_id)
  form.append('center_id', String(center_id))
  form.append('mode', mode)
  form.append('file', file)
  return (
    await axios.post<TableImportResult>(
      r(`media/studies/cohorts/${String(cohort_id)}/table-import/`),
      form
    )
  ).data
}
