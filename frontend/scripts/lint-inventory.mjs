import path from 'node:path'
import process from 'node:process'

import { ESLint } from 'eslint'

function scopeFor(relativePath) {
  if (relativePath.startsWith('cypress/')) return 'cypress'
  if (
    relativePath.startsWith('tests/') ||
    relativePath.includes('/__tests__/') ||
    /\.(?:test|spec)\.[^.]+$/.test(relativePath)
  ) {
    return 'test'
  }
  return 'production'
}

export async function collectLintInventory(ruleIds) {
  const selectedRuleIds = new Set(ruleIds)
  return collectInventory((message) =>
    message.ruleId === null ? false : selectedRuleIds.has(message.ruleId)
  )
}

export async function collectErrorLintInventory() {
  return collectInventory((message) => message.severity === 2)
}

async function collectInventory(includeMessage) {
  const scopes = { production: 0, test: 0, cypress: 0 }
  const rules = {}
  const files = {}
  const results = await new ESLint().lintFiles(['src', 'tests', 'cypress'])

  for (const result of results) {
    const relativePath = path.relative(process.cwd(), result.filePath).split(path.sep).join('/')
    const scope = scopeFor(relativePath)

    for (const message of result.messages) {
      if (!includeMessage(message)) continue
      const ruleId = message.ruleId ?? '<fatal>'
      scopes[scope] += 1
      rules[ruleId] = (rules[ruleId] ?? 0) + 1
      files[relativePath] ??= {}
      files[relativePath][ruleId] = (files[relativePath][ruleId] ?? 0) + 1
    }
  }

  return {
    total: scopes.production + scopes.test + scopes.cypress,
    scopes,
    rules: Object.fromEntries(
      Object.entries(rules).sort(([left], [right]) => left.localeCompare(right))
    ),
    files: Object.fromEntries(
      Object.entries(files)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([file, fileRules]) => [
          file,
          Object.fromEntries(
            Object.entries(fileRules).sort(([left], [right]) => left.localeCompare(right))
          )
        ])
    )
  }
}

export async function writeLintInventory(ruleIds) {
  const inventory = await collectLintInventory(ruleIds)
  process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`)
}

export async function writeErrorLintInventory() {
  const inventory = await collectErrorLintInventory()
  process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`)
}
