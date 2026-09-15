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
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
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
    left: `${String((box.x / imageWidth) * 100)}%`,
    top: `${String((box.y / imageHeight) * 100)}%`,
    width: `${String((box.width / imageWidth) * 100)}%`,
    height: `${String((box.height / imageHeight) * 100)}%`
  }
}

export const formatFrameBox = (box: FrameBoxAnnotationDraft): string =>
  [
    `x ${String(Math.round(box.x))}`,
    `y ${String(Math.round(box.y))}`,
    `w ${String(Math.round(box.width))}`,
    `h ${String(Math.round(box.height))}`
  ].join(' / ')

export const extractFrameBoxRecords = (payload: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    )
  }
  if (!payload || typeof payload !== 'object') {
    return []
  }
  const payloadRecord = payload as Record<string, unknown>
  const records = Array.isArray(payloadRecord.annotations)
    ? payloadRecord.annotations
    : Array.isArray(payloadRecord.results)
      ? payloadRecord.results
      : []
  return records.filter(
    (item): item is Record<string, unknown> => !!item && typeof item === 'object'
  )
}

type RequiredFrameBoxFields = Pick<
  FrameBoxAnnotationDraft,
  | 'frameId'
  | 'labelId'
  | 'labelName'
  | 'x'
  | 'y'
  | 'width'
  | 'height'
  | 'imageWidth'
  | 'imageHeight'
>

function backendField(
  raw: Record<string, unknown>,
  camelCaseKey: string,
  snakeCaseKey: string
): unknown {
  return raw[camelCaseKey] ?? raw[snakeCaseKey]
}

function requiredFrameBoxFields(raw: Record<string, unknown>): RequiredFrameBoxFields | null {
  const labelNameValue = backendField(raw, 'labelName', 'label_name')
  const values = {
    frameId: parseOptionalNumber(backendField(raw, 'frameId', 'frame_id')),
    labelId: parseOptionalNumber(backendField(raw, 'labelId', 'label_id')),
    x: parseOptionalNumber(raw.x),
    y: parseOptionalNumber(raw.y),
    width: parseOptionalNumber(raw.width),
    height: parseOptionalNumber(raw.height),
    imageWidth: parseOptionalNumber(backendField(raw, 'imageWidth', 'image_width')),
    imageHeight: parseOptionalNumber(backendField(raw, 'imageHeight', 'image_height')),
    labelName: typeof labelNameValue === 'string' ? labelNameValue.trim() : ''
  }
  if (Object.values(values).some((value) => value === null || value === '')) return null
  return values as RequiredFrameBoxFields
}

export const parseFrameBoxRecord = (
  raw: Record<string, unknown>,
  context: { fallbackAnnotator: string; createId: IdFactory }
): FrameBoxAnnotationDraft | null => {
  const annotationId = parseOptionalNumber(raw.id)
  const fields = requiredFrameBoxFields(raw)
  if (!fields) return null

  const externalRaw = backendField(raw, 'externalAnnotationId', 'external_annotation_id')
  const annotatorRaw = raw.annotator
  return {
    id: annotationId,
    clientId: annotationId !== null ? `box-${String(annotationId)}` : context.createId(),
    ...fields,
    value: raw.value !== false,
    floatValue: parseOptionalNumber(backendField(raw, 'floatValue', 'float_value')),
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
