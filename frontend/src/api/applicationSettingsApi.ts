import axiosInstance, { r } from '@/api/axiosInstance'

export interface ApplicationSettingsRecord {
  id: number
  centerId: number | null
  centerName: string | null
  processorId: number | null
  processorName: string | null
  annotatorName: string | null
  reportTemplateName: string | null
  updatedAt: string | null
}

export interface ApplicationSettingsUpdatePayload {
  centerId?: number | null
  processorId?: number | null
  reportTemplateName?: string | null
}

export interface NamedDropdownOption {
  id: number
  name: string
}

export interface ValueLabelOption {
  value: string
  label: string
}

export interface ApplicationSettingsDropdowns {
  centers: NamedDropdownOption[]
  processors: NamedDropdownOption[]
  reportTemplates: ValueLabelOption[]
}

const SETTINGS_DETAIL_PATH = 'settings/application/'
const SETTINGS_CENTERS_PATH = 'settings/application/dropdowns/centers/'
const SETTINGS_PROCESSORS_PATH = 'settings/application/dropdowns/processors/'
const SETTINGS_REPORT_TEMPLATES_PATH = 'settings/application/dropdowns/report_templates/'

export async function fetchApplicationSettings(): Promise<ApplicationSettingsRecord> {
  const { data } = await axiosInstance.get<ApplicationSettingsRecord>(r(SETTINGS_DETAIL_PATH))
  return data
}

export async function updateApplicationSettings(
  payload: ApplicationSettingsUpdatePayload
): Promise<ApplicationSettingsRecord> {
  const { data } = await axiosInstance.patch<ApplicationSettingsRecord>(r(SETTINGS_DETAIL_PATH), payload)
  return data
}

export async function fetchApplicationSettingsDropdowns(): Promise<ApplicationSettingsDropdowns> {
  const [centersResponse, processorsResponse, reportTemplatesResponse] = await Promise.all([
    axiosInstance.get<NamedDropdownOption[]>(r(SETTINGS_CENTERS_PATH)),
    axiosInstance.get<NamedDropdownOption[]>(r(SETTINGS_PROCESSORS_PATH)),
    axiosInstance.get<ValueLabelOption[]>(r(SETTINGS_REPORT_TEMPLATES_PATH))
  ])

  return {
    centers: centersResponse.data,
    processors: processorsResponse.data,
    reportTemplates: reportTemplatesResponse.data
  }
}
