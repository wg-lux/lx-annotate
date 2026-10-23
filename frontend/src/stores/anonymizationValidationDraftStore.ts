import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useAuthKcStore } from './auth_kc'
import type { MediaScope } from './mediaTypeStore'

export type EditableValidationPatient = {
  patientFirstName: string
  patientLastName: string
  patientGenderName: string
  patientDob: string
  casenumber: string
  externalId?: string
  externalIdOrigin?: string
  centerName?: string
  text?: string
  anonymizedText?: string
  examinersDisplay?: string
  examinationDate?: string
}

interface ValidationDraft {
  file_id: number
  media_type: MediaScope
  patient: EditableValidationPatient
  anonymized_text: string
  examination_date: string
  tags: string[]
  custom_tag_input: string
  validation_comment: string
  document_type: string
  patient_examination_option: string
  manual_patient_examination_id: string
  no_more_names_confirmation: 'unknown' | 'confirmed' | 'not_confirmed'
}

interface ValidationTarget {
  file_id: number
  media_type: 'pdf' | 'video'
}

function read_resume_target(): ValidationTarget | null {
  const file_id = Number(sessionStorage.getItem('last:fileId'))
  const media_type = sessionStorage.getItem('last:scope')
  if (
    Number.isSafeInteger(file_id) &&
    file_id > 0 &&
    (media_type === 'pdf' || media_type === 'video')
  ) {
    return { file_id, media_type }
  }
  return null
}

// One correction round trip, held only in this Pinia session: never browser storage.
export const useAnonymizationValidationDraftStore = defineStore(
  'anonymization_validation_draft',
  () => {
    const draft = ref<ValidationDraft | null>(null)
    const resume_target = ref(read_resume_target())
    const auth = useAuthKcStore()
    watch(
      () => auth.user?.sub ?? auth.user?.username,
      () => {
        draft.value = null
        clear_resume_target()
      },
      { flush: 'sync' }
    )

    function remember(media_type: ValidationTarget['media_type'], file_id: number): void {
      if (!Number.isSafeInteger(file_id) || file_id <= 0) {
        throw new TypeError('Validation resume target requires a positive integer file ID')
      }
      sessionStorage.setItem('last:fileId', String(file_id))
      sessionStorage.setItem('last:scope', media_type)
      resume_target.value = { media_type, file_id }
    }

    function clear_resume_target(): void {
      sessionStorage.removeItem('last:fileId')
      sessionStorage.removeItem('last:scope')
      resume_target.value = null
    }

    function clear(media_type: MediaScope, file_id: number): void {
      if (draft.value?.media_type === media_type && draft.value.file_id === file_id) {
        draft.value = null
      }
      if (
        resume_target.value?.media_type === media_type &&
        resume_target.value.file_id === file_id
      ) {
        clear_resume_target()
      }
    }

    return { draft, resume_target, remember, clear }
  }
)
