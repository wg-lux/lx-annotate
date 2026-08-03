import { describe, expect, it } from 'vitest'

import {
  clampFrameCoordinate,
  createFrameBoxDraft,
  extractFrameBoxRecords,
  formatFrameBox,
  frameBoxStyle,
  parseFrameBoxRecord,
  serializeFrameBox,
  type FrameBoxAnnotationDraft
} from '../frameBoxAnnotations'

const ids = () => {
  let next = 0
  return () => `generated-${++next}`
}

const boxFixture = (): FrameBoxAnnotationDraft => ({
  id: null,
  clientId: 'client-1',
  frameId: 101,
  labelId: 12,
  labelName: 'sensitive_region',
  value: true,
  floatValue: null,
  x: 10.4,
  y: 20.5,
  width: 30.6,
  height: 40.4,
  imageWidth: 200,
  imageHeight: 100,
  annotator: 'oidc:reviewer',
  externalAnnotationId: 'external-1'
})

describe('frame box annotations', () => {
  it('clamps coordinates and creates a normalized reverse-drag box', () => {
    expect(clampFrameCoordinate(-4, 0, 100)).toBe(0)
    expect(clampFrameCoordinate(104, 0, 100)).toBe(100)
    const createId = ids()
    const box = createFrameBoxDraft(
      { x: 80, y: 70, imageWidth: 200, imageHeight: 100 },
      { x: 20, y: 10, imageWidth: 200, imageHeight: 100 },
      {
        frameId: 101,
        label: { id: 12, name: 'sensitive_region' },
        annotator: 'oidc:reviewer',
        createId
      }
    )
    expect(box).toMatchObject({
      clientId: 'generated-1',
      externalAnnotationId: 'generated-2',
      x: 20,
      y: 10,
      width: 60,
      height: 60
    })
  })

  it('normalizes list envelopes and rejects malformed records', () => {
    expect(extractFrameBoxRecords({ results: [{ id: 1 }, null, 'invalid'] })).toEqual([{ id: 1 }])
    expect(
      parseFrameBoxRecord(
        { frame_id: 101, label_id: 12, label_name: 'sensitive_region' },
        { fallbackAnnotator: 'oidc:reviewer', createId: ids() }
      )
    ).toBeNull()
  })

  it('parses snake-case API records with explicit identity fallbacks', () => {
    const parsed = parseFrameBoxRecord(
      {
        frame_id: '101',
        label_id: 12,
        label_name: ' sensitive_region ',
        x: 10,
        y: 20,
        width: 30,
        height: 40,
        image_width: 200,
        image_height: 100
      },
      { fallbackAnnotator: 'oidc:reviewer', createId: ids() }
    )
    expect(parsed).toMatchObject({
      clientId: 'generated-1',
      externalAnnotationId: 'generated-2',
      frameId: 101,
      labelName: 'sensitive_region',
      annotator: 'oidc:reviewer'
    })
  })

  it('owns box presentation and API serialization', () => {
    const box = boxFixture()
    expect(frameBoxStyle(box)).toEqual({
      left: '5.2%',
      top: '20.5%',
      width: '15.299999999999999%',
      height: '40.4%'
    })
    expect(formatFrameBox(box)).toBe('x 10 / y 21 / w 31 / h 40')
    expect(
      serializeFrameBox(box, {
        frameId: 101,
        informationSourceName: 'lx_anonymizer_evaluation',
        annotator: 'oidc:reviewer'
      })
    ).toEqual({
      id: null,
      frame_id: 101,
      label_id: 12,
      value: true,
      float_value: null,
      x: 10,
      y: 21,
      width: 31,
      height: 40,
      image_width: 200,
      image_height: 100,
      information_source_name: 'lx_anonymizer_evaluation',
      annotator: 'oidc:reviewer',
      external_annotation_id: 'external-1',
      model_meta_id: null
    })
  })
})
