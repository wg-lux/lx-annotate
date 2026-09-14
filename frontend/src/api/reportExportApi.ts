import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'
import type { ReportFrameSelection } from '@/utils/frameStreams'

export type ReportExportPatientIdentity = {
  firstName: string
  lastName: string
  dob: string
}

export type MakeReportRequest = {
  patientExaminationId: number
  reportId?: number | null
  knowledgeBaseModule: string
  knowledgeBaseVersion: string
  patient: ReportExportPatientIdentity
  maxFrames?: number
  preferredFrame?: ReportFrameSelection | null
  selectedFrames?: ReportFrameSelection[]
}

export type PersistedReportArtifacts = {
  fullReportId?: number | null
  pdfId?: number | null
  pdfViewUrl?: string | null
  pdfDownloadUrl?: string | null
  patientTimelineUrl?: string | null
}

export type IncludedReportFrame = {
  segmentId: number | null
  videoId: number
  frameId: number
  frameNumber: number
  timestamp?: number
  labelName?: string | null
  findingName?: string | null
  streamUrl?: string | null
  caption?: string | null
}

export type MakeReportResponse = {
  report: {
    id: number
    status?: string | null
    version?: number | null
  }
  warnings?: string[]
  includedFrameCount: number
  includedFrames?: IncludedReportFrame[]
  persistedReportArtifactId?: number | null
  persistedPdfArtifactId?: number | null
  persistedArtifacts?: PersistedReportArtifacts | null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isInteger = (value: unknown, minimum = 1): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum

export function requireReportArtifactUrl(value: unknown) {
  if (value === undefined || value === null) {
    return
  }
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError('Invalid report artifact URL')
  }
  const artifactUrl = new URL(value, window.location.origin)
  const apiOrigin = new URL(r(endpoints.report.makeReport), window.location.origin).origin
  if (
    !['http:', 'https:'].includes(artifactUrl.protocol) ||
    artifactUrl.username ||
    artifactUrl.password ||
    ![window.location.origin, apiOrigin].includes(artifactUrl.origin)
  ) {
    throw new TypeError('Untrusted report artifact URL')
  }
}

function requireExportArtifacts(value: unknown) {
  if (value === undefined || value === null) {
    return
  }
  if (!isRecord(value)) {
    throw new TypeError('Invalid report artifacts')
  }
  for (const field of ['fullReportId', 'pdfId']) {
    const artifactId = value[field]
    if (artifactId !== undefined && artifactId !== null && !isInteger(artifactId)) {
      throw new TypeError('Invalid report artifact ID')
    }
  }
  for (const field of ['pdfViewUrl', 'pdfDownloadUrl', 'patientTimelineUrl']) {
    requireReportArtifactUrl(value[field])
  }
}

function requireIncludedFrameText(frame: Record<string, unknown>) {
  for (const field of ['labelName', 'findingName', 'caption']) {
    const text = frame[field]
    if (text !== undefined && text !== null && typeof text !== 'string') {
      throw new TypeError('Invalid included report frame text')
    }
  }
}

function requireIncludedFrame(frame: unknown) {
  if (
    !isRecord(frame) ||
    (frame.segmentId !== null && !isInteger(frame.segmentId)) ||
    !isInteger(frame.videoId) ||
    !isInteger(frame.frameId) ||
    !isInteger(frame.frameNumber, 0)
  ) {
    throw new TypeError('Invalid included report frame')
  }
  requireIncludedFrameText(frame)
  requireReportArtifactUrl(frame.streamUrl)
}

function requireIncludedFrames(value: unknown, count: number) {
  if (value === undefined) {
    return
  }
  if (!Array.isArray(value) || value.length !== count) {
    throw new TypeError('Invalid report frame count')
  }
  for (const frame of value) {
    requireIncludedFrame(frame)
  }
}

function requireReportIdentity(report: Record<string, unknown>, request: MakeReportRequest) {
  if (
    !isInteger(report.id) ||
    !isInteger(report.version) ||
    report.status !== 'final' ||
    report.patientExaminationId !== request.patientExaminationId ||
    (report.patient_examination_id !== undefined &&
      report.patient_examination_id !== request.patientExaminationId) ||
    (request.reportId != null && report.id !== request.reportId)
  ) {
    throw new TypeError('Report export response does not match the requested report')
  }
}

function requireReportWarnings(value: unknown) {
  if (
    value !== undefined &&
    (!Array.isArray(value) || !value.every((warning: unknown) => typeof warning === 'string'))
  ) {
    throw new TypeError('Invalid report export warnings')
  }
}

function requirePersistedArtifactIds(value: Record<string, unknown>) {
  for (const field of ['persistedReportArtifactId', 'persistedPdfArtifactId']) {
    const artifactId = value[field]
    if (artifactId !== undefined && artifactId !== null && !isInteger(artifactId)) {
      throw new TypeError('Invalid report artifact ID')
    }
  }
}

function selectedRequestFrames(request: MakeReportRequest): ReportFrameSelection[] | null {
  return request.selectedFrames ?? (request.preferredFrame ? [request.preferredFrame] : null)
}

function matchesSelectedFrame(frame: unknown, expected: ReportFrameSelection): boolean {
  return (
    isRecord(frame) &&
    frame.videoId === expected.videoId &&
    frame.frameNumber === expected.frameNumber &&
    frame.timestamp === expected.timestamp
  )
}

function requireSelectedFrames(value: Record<string, unknown>, request: MakeReportRequest) {
  const selected = selectedRequestFrames(request)
  if (selected === null) {
    return
  }
  const included = value.includedFrames
  if (
    !Array.isArray(included) ||
    value.includedFrameCount !== selected.length ||
    selected.some((expected, index) => !matchesSelectedFrame(included[index], expected))
  ) {
    throw new TypeError('Report export did not use the selected frames and timestamps')
  }
}

function assertMakeReportResponse(
  value: unknown,
  request: MakeReportRequest
): asserts value is MakeReportResponse {
  if (!isRecord(value) || !isRecord(value.report)) {
    throw new TypeError('Invalid report export response')
  }
  const report = value.report
  requireReportIdentity(report, request)
  if (!isInteger(value.includedFrameCount, 0)) {
    throw new TypeError('Invalid report frame count')
  }
  requireReportWarnings(value.warnings)
  requirePersistedArtifactIds(value)
  requireIncludedFrames(value.includedFrames, value.includedFrameCount)
  requireSelectedFrames(value, request)
  requireExportArtifacts(value.persistedArtifacts)
}

export async function makeReport(payload: MakeReportRequest): Promise<MakeReportResponse> {
  const { data } = await axiosInstance.post<unknown>(r(endpoints.report.makeReport), payload)
  assertMakeReportResponse(data, payload)
  return data
}

export type ReportFrameCandidate = ReportFrameSelection & { labels: string[] }
export type ReportFrameCandidates = {
  frames: ReportFrameCandidate[]
  labels: string[]
  nextOffset: number | null
}

export async function fetchReportFrameCandidates(
  examinationId: number,
  label: string,
  offset: number
): Promise<ReportFrameCandidates> {
  const { data } = await axiosInstance.get<unknown>(
    r('/patient-examination-reports/frame-candidates'),
    {
      params: { patient_examination_id: examinationId, ...(label ? { label } : {}), offset }
    }
  )
  if (
    !isRecord(data) ||
    !Array.isArray(data.frames) ||
    !Array.isArray(data.labels) ||
    !data.labels.every((item: unknown) => typeof item === 'string') ||
    !(data.nextOffset === null || isInteger(data.nextOffset, 0)) ||
    !data.frames.every(
      (frame: unknown) =>
        isRecord(frame) &&
        isInteger(frame.videoId) &&
        isInteger(frame.frameNumber, 0) &&
        typeof frame.timestamp === 'number' &&
        Number.isFinite(frame.timestamp) &&
        frame.timestamp >= 0 &&
        Array.isArray(frame.labels) &&
        frame.labels.every((label: unknown) => typeof label === 'string')
    )
  ) {
    throw new TypeError('Invalid report frame candidates')
  }
  return data as ReportFrameCandidates
}
