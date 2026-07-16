#!/usr/bin/env node
import { endpoints } from '../../frontend/src/types/api/endpoints.js'

function sampleArgsForKey(keyPath, arity) {
  if (keyPath === 'requirements.lookupParts') {
    return ['__TOKEN__', ['__KEY__']]
  }
  const args = []
  for (let i = 0; i < arity; i += 1) {
    args.push(`__ARG${i + 1}__`)
  }
  return args
}

function flatten(obj, prefix = []) {
  const rows = []
  for (const [key, value] of Object.entries(obj)) {
    const next = [...prefix, key]
    const keyPath = next.join('.')
    if (typeof value === 'string') {
      rows.push({
        key: keyPath,
        type: 'string',
        path: value,
      })
      continue
    }
    if (typeof value === 'function') {
      let path = null
      let error = null
      try {
        path = value(...sampleArgsForKey(keyPath, value.length))
      } catch (e) {
        error = e instanceof Error ? e.message : String(e)
      }
      rows.push({
        key: keyPath,
        type: 'function',
        arity: value.length,
        path,
        error,
      })
      continue
    }
    if (value && typeof value === 'object') {
      rows.push(...flatten(value, next))
    }
  }
  return rows
}

const routes = flatten(endpoints)
const payload = {
  kind: 'frontend_endpoint_manifest',
  count: routes.length,
  routes,
}

console.log(JSON.stringify(payload, null, 2))

