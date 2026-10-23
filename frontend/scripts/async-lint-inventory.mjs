import { writeLintInventory } from './lint-inventory.mjs'

await writeLintInventory([
  '@typescript-eslint/no-confusing-void-expression',
  '@typescript-eslint/no-floating-promises',
  '@typescript-eslint/no-misused-promises',
  '@typescript-eslint/prefer-promise-reject-errors',
  '@typescript-eslint/require-await'
])
