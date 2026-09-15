import { describe, expect, it } from 'vitest'

import {
  ReportingKnowledgeBaseMismatchError,
  readReportingKnowledgeBaseIdentity,
  resolveReportingKnowledgeBaseContext
} from '../reportingKnowledgeBaseContext'

describe('reportingKnowledgeBaseContext', () => {
  it.each([
    [
      { knowledgeBaseModule: ' clinical_reporting ', knowledgeBaseVersion: ' 2.0.0 ' },
      { moduleName: 'clinical_reporting', moduleVersion: '2.0.0' }
    ],
    [
      { knowledge_base_module: 'clinical_reporting', knowledge_base_version: '2.0.0' },
      { moduleName: 'clinical_reporting', moduleVersion: '2.0.0' }
    ]
  ])('reads a complete persisted identity from supported wire casing', (payload, expected) => {
    // Arrange
    const persisted: unknown = payload

    // Act
    const identity = readReportingKnowledgeBaseIdentity(persisted)

    // Assert
    expect(identity).toEqual(expected)
  })

  it.each([
    null,
    [],
    {},
    { knowledgeBaseModule: 'clinical_reporting' },
    { knowledgeBaseVersion: '2.0.0' },
    { knowledgeBaseModule: ' ', knowledgeBaseVersion: '2.0.0' }
  ])('rejects incomplete persisted identity %p', (payload) => {
    // Arrange
    const persisted: unknown = payload

    // Act
    const identity = readReportingKnowledgeBaseIdentity(persisted)

    // Assert
    expect(identity).toBeNull()
  })

  it('prefers the matching active bundle while retaining examination scope', () => {
    // Arrange
    const params = {
      patientExaminationId: 314,
      pinnedIdentity: { moduleName: 'clinical_reporting', moduleVersion: '2.0.0' },
      activeBundle: { moduleName: 'clinical_reporting', version: '2.0.0' }
    }

    // Act
    const context = resolveReportingKnowledgeBaseContext(params)

    // Assert
    expect(context).toEqual({
      moduleName: 'clinical_reporting',
      moduleVersion: '2.0.0',
      patientExaminationId: 314
    })
  })

  it('uses a pinned identity when no mutable active bundle exists', () => {
    // Arrange
    const params = {
      patientExaminationId: 314,
      pinnedIdentity: { moduleName: 'clinical_reporting', moduleVersion: '2.0.0' },
      activeBundle: null
    }

    // Act
    const context = resolveReportingKnowledgeBaseContext(params)

    // Assert
    expect(context).toMatchObject({ moduleName: 'clinical_reporting', moduleVersion: '2.0.0' })
  })

  it('fails closed when the active bundle differs from the persisted identity', () => {
    // Arrange
    const params = {
      patientExaminationId: 314,
      pinnedIdentity: { moduleName: 'clinical_reporting', moduleVersion: '2.0.0' },
      activeBundle: { moduleName: 'clinical_reporting', version: '3.0.0' }
    }

    // Act
    const resolve = () => resolveReportingKnowledgeBaseContext(params)

    // Assert
    expect(resolve).toThrow(ReportingKnowledgeBaseMismatchError)
    try {
      resolve()
    } catch (error: unknown) {
      expect(error).toMatchObject({
        patientExaminationId: 314,
        pinnedIdentity: params.pinnedIdentity,
        activeBundle: params.activeBundle
      })
    }
  })
})
