export interface FrameBoxAnnotationDraft {
  id: number | null
  clientId: string
  frameId: number
  labelId: number
  labelName: string
  value: boolean
  floatValue: number | null
  x: number
  y: number
  width: number
  height: number
  imageWidth: number
  imageHeight: number
  annotator: string
  externalAnnotationId: string
}

export interface FrameImagePoint {
  x: number
  y: number
  imageWidth: number
  imageHeight: number
}

export interface FrameBoxLabel {
  id: number
  name: string
}

type IdFactory = () => string

const parseOptionalNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export const clampFrameCoordinate = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export const createFrameBoxDraft = (
  start: FrameImagePoint,
  current: FrameImagePoint,
  context: {
    frameId: number
    label: FrameBoxLabel
    annotator: string
    createId: IdFactory
  }
): FrameBoxAnnotationDraft => ({
  id: null,
  clientId: context.createId(),
  frameId: context.frameId,
  labelId: context.label.id,
  labelName: context.label.name,
  value: true,
  floatValue: null,
  x: Math.min(start.x, current.x),
  y: Math.min(start.y, current.y),
  width: Math.abs(current.x - start.x),
  height: Math.abs(current.y - start.y),
  imageWidth: current.imageWidth,
  imageHeight: current.imageHeight,
  annotator: context.annotator,
  externalAnnotationId: context.createId()
})

export const frameBoxStyle = (box: FrameBoxAnnotationDraft): Record<string, string> => {
  const imageWidth = box.imageWidth || 1
  const imageHeight = box.imageHeight || 1
  return {
    left: `${(box.x / imageWidth) * 100}%`,
    top: `${(box.y / imageHeight) * 100}%`,
    width: `${(box.width / imageWidth) * 100}%`,
    height: `${(box.height / imageHeight) * 100}%`
  }
}

export const formatFrameBox = (box: FrameBoxAnnotationDraft): string =>
  [
    `x ${Math.round(box.x)}`,
    `y ${Math.round(box.y)}`,
    `w ${Math.round(box.width)}`,
    `h ${Math.round(box.height)}`
  ].join(' / ')

export const extractFrameBoxRecords = (payload: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    )
  }
  if (!payload || typeof payload !== 'object') return []
  const obj = payload as Record<string, unknown>
  const records = Array.isArray(obj.annotations)
    ? obj.annotations
    : Array.isArray(obj.results)
      ? obj.results
      : []
  return records.filter(
    (item): item is Record<string, unknown> => !!item && typeof item === 'object'
  )
}

export const parseFrameBoxRecord = (
  raw: Record<string, unknown>,
  context: { fallbackAnnotator: string; createId: IdFactory }
): FrameBoxAnnotationDraft | null => {
  const id = parseOptionalNumber(raw.id)
  const frameId = parseOptionalNumber(raw.frameId ?? raw.frame_id)
  const labelId = parseOptionalNumber(raw.labelId ?? raw.label_id)
  const x = parseOptionalNumber(raw.x)
  const y = parseOptionalNumber(raw.y)
  const width = parseOptionalNumber(raw.width)
  const height = parseOptionalNumber(raw.height)
  const imageWidth = parseOptionalNumber(raw.imageWidth ?? raw.image_width)
  const imageHeight = parseOptionalNumber(raw.imageHeight ?? raw.image_height)
  const labelNameRaw = raw.labelName ?? raw.label_name
  const labelName = typeof labelNameRaw === 'string' ? labelNameRaw.trim() : ''
  if (
    frameId === null ||
    labelId === null ||
    x === null ||
    y === null ||
    width === null ||
    height === null ||
    imageWidth === null ||
    imageHeight === null ||
    !labelName
  ) {
    return null
  }

  const externalRaw = raw.externalAnnotationId ?? raw.external_annotation_id
  const annotatorRaw = raw.annotator
  return {
    id,
    clientId: id !== null ? `box-${id}` : context.createId(),
    frameId,
    labelId,
    labelName,
    value: raw.value !== false,
    floatValue: parseOptionalNumber(raw.floatValue ?? raw.float_value),
    x,
    y,
    width,
    height,
    imageWidth,
    imageHeight,
    annotator: typeof annotatorRaw === 'string' ? annotatorRaw : context.fallbackAnnotator,
    externalAnnotationId:
      typeof externalRaw === 'string' && externalRaw.trim()
        ? externalRaw.trim()
        : context.createId()
  }
}

export const serializeFrameBox = (
  box: FrameBoxAnnotationDraft,
  context: { frameId: number; informationSourceName: string; annotator: string }
) => ({
  id: box.id,
  frame_id: context.frameId,
  label_id: box.labelId,
  value: box.value,
  float_value: box.floatValue,
  x: Math.round(box.x),
  y: Math.round(box.y),
  width: Math.round(box.width),
  height: Math.round(box.height),
  image_width: Math.round(box.imageWidth),
  image_height: Math.round(box.imageHeight),
  information_source_name: context.informationSourceName,
  annotator: context.annotator,
  external_annotation_id: box.externalAnnotationId,
  model_meta_id: null
})
