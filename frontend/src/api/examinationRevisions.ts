import axiosInstance, { r } from '@/api/axiosInstance'
import type { components } from '@/types/generated/dtypes-api'
import type { components as EndoregComponents } from '@/types/generated/endoreg-api'
import type { Camelize } from '@/types/api/openapi'
import type { PatientMedicationCreatePayload, LabValueNormalRange } from '@/api/patientService'

export interface ExaminationRevision {
  id: number
  patientExaminationId: number
  title: string
  version: number
  finalizedAt: string | null
  snapshot: {
    evidence?: Camelize<EndoregComponents['schemas']['ExaminationEvidence']>
    content: {
      examination: Camelize<components['schemas']['PExamination']>
      medications: PatientMedicationCreatePayload[]
      labValues: {
        labValue: string
        value: number | null
        valueStr: string | null
        timestamp: string
        unit: string | null
        normalRange: LabValueNormalRange
      }[]
    }
  }
}
export interface RevisionSelection {
  reportId: number | null
  videoId: number | null
  annotator: string | null
  medicationIds: number[]
  labValueIds: number[]
}
export interface SelectedExamination {
  patientExaminationId: number
  revisionId: number
}

export const examinationRevisions = {
  async copy(record: ExaminationRevision): Promise<ExaminationRevision> {
    return (
      await axiosInstance.post<ExaminationRevision>(r('examination-revisions/'), {
        patientExaminationId: record.patientExaminationId,
        title: `${record.title} – neue Fassung`,
        sourceRevisionId: record.id
      })
    ).data
  },
  async list(patientExaminationId: number): Promise<ExaminationRevision[]> {
    return (
      await axiosInstance.get<ExaminationRevision[]>(r('examination-revisions/'), {
        params: { patient_examination_id: patientExaminationId }
      })
    ).data
  },
  async create(
    patientExaminationId: number,
    title: string,
    selection: RevisionSelection
  ): Promise<ExaminationRevision> {
    return (
      await axiosInstance.post<ExaminationRevision>(r('examination-revisions/'), {
        patientExaminationId,
        title,
        selection
      })
    ).data
  },
  async update(record: ExaminationRevision): Promise<ExaminationRevision> {
    return (
      await axiosInstance.put<ExaminationRevision>(
        r(`examination-revisions/${String(record.id)}/`),
        { expectedVersion: record.version, title: record.title, content: record.snapshot.content }
      )
    ).data
  },
  async finalize(record: ExaminationRevision): Promise<ExaminationRevision> {
    return (
      await axiosInstance.post<ExaminationRevision>(
        r(`examination-revisions/${String(record.id)}/finalize/`),
        { expectedVersion: record.version }
      )
    ).data
  },
  async remove(record: ExaminationRevision): Promise<void> {
    await axiosInstance.delete(r(`examination-revisions/${String(record.id)}/`), {
      data: { expectedVersion: record.version }
    })
  },
  async selections(caseId: string): Promise<SelectedExamination[]> {
    return (
      await axiosInstance.get<SelectedExamination[]>(r(`cases/${caseId}/select-examination/`))
    ).data
  },
  async select(caseId: string, record: ExaminationRevision): Promise<void> {
    await axiosInstance.post(r(`cases/${caseId}/select-examination/`), {
      revisionId: record.id,
      expectedVersion: record.version
    })
  },
  async workbook(caseId: string): Promise<Blob> {
    return (
      await axiosInstance.get<Blob>(r(`cases/${caseId}/research-export/`), {
        params: { output: 'xlsx' },
        responseType: 'blob'
      })
    ).data
  }
}
