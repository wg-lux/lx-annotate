import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { ESLint } from 'eslint'

const LOGGER_SINK = 'src/utils/runtimeLogger.ts'
const eslint = new ESLint({
  overrideConfig: {
    rules: {
      'no-console': 'error'
    }
  }
})
const results = await eslint.lintFiles(['src'])
const methods = {}
const files = {}

for (const result of results) {
  const relativePath = path.relative(process.cwd(), result.filePath).split(path.sep).join('/')
  if (relativePath === LOGGER_SINK) continue
  const messages = result.messages.filter((message) => message.ruleId === 'no-console')
  if (messages.length === 0) continue

  const source = result.source ?? (await readFile(result.filePath, 'utf8'))
  const lines = source.split(/\r?\n/)
  const fileMethods = {}

  for (const message of messages) {
    const line = lines[message.line - 1] ?? ''
    const statement = line.slice(Math.max(0, message.column - 1))
    const method = /^console\.([A-Za-z]+)/.exec(statement)?.[1] ?? 'unknown'
    methods[method] = (methods[method] ?? 0) + 1
    fileMethods[method] = (fileMethods[method] ?? 0) + 1
  }

  files[relativePath] = Object.fromEntries(
    Object.entries(fileMethods).sort(([left], [right]) => left.localeCompare(right))
  )
}

const sortedMethods = Object.fromEntries(
  Object.entries(methods).sort(([left], [right]) => left.localeCompare(right))
)
const sortedFiles = Object.fromEntries(
  Object.entries(files).sort(([left], [right]) => left.localeCompare(right))
)

process.stdout.write(
  `${JSON.stringify(
    {
      total: Object.values(methods).reduce((total, count) => total + count, 0),
      methods: sortedMethods,
      files: sortedFiles
    },
    null,
    2
  )}\n`
)
