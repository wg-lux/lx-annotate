import type { Ref } from 'vue';
type LookupSessionStatus = 'idle' | 'active' | 'expired' | 'restarting';
type LookupFlowLike = {
    lookupToken: string | null;
    setSessionStatus: (status: LookupSessionStatus) => void;
};
type UseLookupActionsParams<TLookup> = {
    flow: LookupFlowLike;
    loading: Ref<boolean>;
    errorMessage: Ref<string | null>;
    successMessage?: Ref<string | null>;
    applyLookup: (partial: Partial<TLookup>) => void;
    clearMessages?: () => void;
};
type LookupActionResult = {
    ok: boolean;
    expired?: boolean;
};
export declare function useLookupActions<TLookup>(params: UseLookupActionsParams<TLookup>): {
    fetchLookupAll: (opts?: {
        skipRecompute?: boolean;
        fallbackErrorMessage?: string;
    }) => Promise<LookupActionResult>;
    fetchLookupParts: (keys: string[], opts?: {
        fallbackErrorMessage?: string;
    }) => Promise<LookupActionResult>;
    patchLookupParts: (updates: Record<string, unknown>, opts?: {
        fallbackErrorMessage?: string;
    }) => Promise<LookupActionResult>;
    recomputeLookup: (opts?: {
        applyUpdates?: boolean;
        refreshAfter?: boolean;
        fallbackErrorMessage?: string;
    }) => Promise<LookupActionResult>;
};
export {};
