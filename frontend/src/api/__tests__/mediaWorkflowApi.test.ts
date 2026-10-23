import { describe, expect, it } from 'vitest'
import {
  parseWorkflowItem,
  parseWorkflowViolations,
  WorkflowContractError
} from '../mediaWorkflowApi'

const item = {
  kind: 'video',
  recordId: 1,
  version: 3,
  source: 'stored',
  privacy: 'awaiting_validation',
  annotation: 'not_available',
  release: 'not_released',
  allowedEvents: ['anonymization_validated', 'correction_requested']
}

describe('mediaWorkflowApi contract parsing', () => {
  it('accepts a well-formed item', () => {
    const parsed = parseWorkflowItem(item)
    expect(parsed.privacy).toBe('awaiting_validation')
    expect(parsed.allowedEvents).toHaveLength(2)
  })

  it('rejects unknown tokens instead of displaying them', () => {
    expect(() => parseWorkflowItem({ ...item, privacy: 'mystery' })).toThrow(WorkflowContractError)
    expect(() => parseWorkflowItem({ ...item, allowedEvents: ['unknown_event'] })).toThrow(
      WorkflowContractError
    )
    expect(() => parseWorkflowItem({ ...item, source: 'guessed' })).toThrow(WorkflowContractError)
  })

  it('rejects malformed payloads and versions', () => {
    expect(() => parseWorkflowItem({ ...item, version: -1 })).toThrow(WorkflowContractError)
    expect(() => parseWorkflowItem(null)).toThrow(WorkflowContractError)
  })

  it('parses 409 violation lists strictly', () => {
    expect(parseWorkflowViolations({ violations: ['released_before_raw_purge'] })).toEqual([
      'released_before_raw_purge'
    ])
    expect(() => parseWorkflowViolations({ violations: [1] })).toThrow(WorkflowContractError)
  })
})
