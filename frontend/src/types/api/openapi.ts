import type { components as EndoregComponents } from '@/types/generated/endoreg-api'
import type { components as DtypesComponents } from '@/types/generated/dtypes-api'

type SnakeToCamel<Key extends string> = Key extends `${infer Head}_${infer Tail}`
  ? `${Head}${Capitalize<SnakeToCamel<Tail>>}`
  : Key

export type Camelize<T> = T extends readonly (infer Item)[]
  ? Camelize<Item>[]
  : T extends object
    ? {
        [Key in keyof T as Key extends string ? SnakeToCamel<Key> : Key]: Camelize<T[Key]>
      }
    : T

export type SegmentFrameSelectorResponse = Camelize<
  EndoregComponents['schemas']['SegmentFrameSelectorResponseSchema']
>

export type SaveReportTemplateRequest = Camelize<
  DtypesComponents['schemas']['SaveReportTemplateRequest']
>
