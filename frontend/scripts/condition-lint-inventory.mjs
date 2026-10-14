import { writeLintInventory } from './lint-inventory.mjs'

await writeLintInventory([
  '@typescript-eslint/no-unnecessary-boolean-literal-compare',
  '@typescript-eslint/no-unnecessary-condition'
])
