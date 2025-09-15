declare const isGeneratingPseudonym: import("vue").Ref<boolean, boolean>;
declare const pseudonymError: import("vue").Ref<string | null, string | null>;
declare const pseudonymSuccess: import("vue").Ref<string | null, string | null>;
/**
 * Generate a pseudonym for the current patient
 * @param patientId - The ID of the patient to generate a pseudonym for
 * @returns The patient hash if successful
 */
declare function generatePseudonym(patientId: number): Promise<string | null>;
export { generatePseudonym, isGeneratingPseudonym, pseudonymError, pseudonymSuccess };
