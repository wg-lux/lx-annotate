import type { ApplicationSettingsRecord } from '@/api/applicationSettingsApi'

export function applicationSettingsFormValues(settings: ApplicationSettingsRecord) {
  return {
    centerId: settings.centerId === null ? '' : String(settings.centerId),
    processorId: settings.processorId === null ? '' : String(settings.processorId),
    annotatorName: settings.annotatorName ?? '',
    reportTemplateName: settings.reportTemplateName ?? '',
    aiDatasetId: settings.aiDatasetId === null ? '' : String(settings.aiDatasetId),
    aiDatasetName: settings.aiDatasetName ?? '',
    aiDatasetType: settings.aiDatasetType ?? ''
  }
}

export function applicationSettingsChanged(
  settings: ApplicationSettingsRecord | null,
  form: ReturnType<typeof applicationSettingsFormValues>
): boolean {
  if (!settings) {
    return false
  }
  const saved = applicationSettingsFormValues(settings)
  return Object.entries(saved).some(([key, value]) => form[key as keyof typeof saved] !== value)
}
