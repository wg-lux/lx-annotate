export interface Center {
  id: number
  name: string
}
export interface Examination {
  id: number
  name: string
}
export interface Finding {
  id: number
  name: string
}
export interface Classification {
  id: number
  name: string
}
export interface ClassificationChoice {
  id: number
  name: string
  classificationId: number
}
export interface Intervention {
  id: number
  name: string
}
export declare function useReportService(): {
  centers: import('vue').Ref<
    {
      id: number
      name: string
    }[],
    | Center[]
    | {
        id: number
        name: string
      }[]
  >
  examinations: import('vue').Ref<
    {
      id: number
      name: string
    }[],
    | Examination[]
    | {
        id: number
        name: string
      }[]
  >
  findings: import('vue').Ref<
    {
      id: number
      name: string
    }[],
    | Finding[]
    | {
        id: number
        name: string
      }[]
  >
  locationClassifications: import('vue').Ref<
    {
      id: number
      name: string
    }[],
    | Classification[]
    | {
        id: number
        name: string
      }[]
  >
  locationClassificationChoices: import('vue').Ref<
    {
      id: number
      name: string
      classificationId: number
    }[],
    | ClassificationChoice[]
    | {
        id: number
        name: string
        classificationId: number
      }[]
  >
  morphologyClassifications: import('vue').Ref<
    {
      id: number
      name: string
    }[],
    | Classification[]
    | {
        id: number
        name: string
      }[]
  >
  morphologyClassificationChoices: import('vue').Ref<
    {
      id: number
      name: string
      classificationId: number
    }[],
    | ClassificationChoice[]
    | {
        id: number
        name: string
        classificationId: number
      }[]
  >
  interventions: import('vue').Ref<
    {
      id: number
      name: string
    }[],
    | Intervention[]
    | {
        id: number
        name: string
      }[]
  >
  getCenters: () => Promise<void>
  getExaminations: () => Promise<Examination[]>
  getFindings: () => Promise<void>
  getLocationClassifications: () => Promise<void>
  getLocationClassificationChoices: () => Promise<void>
  getMorphologyClassifications: () => Promise<void>
  getMorphologyClassificationChoices: () => Promise<void>
  getInterventions: () => Promise<void>
}
