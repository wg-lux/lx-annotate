import type { CoreConceptCollection } from '@/types/coreConcepts';
export declare const normalizeCoreConceptCollection: (raw: unknown) => CoreConceptCollection;
export declare const fetchCoreConcepts: (moduleName: string) => Promise<CoreConceptCollection>;
