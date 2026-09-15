import { writeLintInventory } from './lint-inventory.mjs'

await writeLintInventory([
  '@typescript-eslint/no-base-to-string',
  '@typescript-eslint/restrict-template-expressions'
])
