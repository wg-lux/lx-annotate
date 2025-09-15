import { type ComputedRef } from 'vue';
/**
 * Composable for robust patient ID resolution across different contexts
 *
 * Provides a single source of truth for current patient ID with precedence:
 * 1. Prop ID (if provided)
 * 2. Store current patient ID
 * 3. Route params patient ID
 */
export declare function useCurrentPatientId(propPatientId?: number | string | null): {
    currentPatientId: ComputedRef<number | null>;
    getCurrentPatientId: (strict?: boolean) => number | null;
    hasValidPatientId: ComputedRef<boolean>;
    patientIdAsString: ComputedRef<string | null>;
};
export default useCurrentPatientId;
