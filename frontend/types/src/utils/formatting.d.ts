export interface LocalizedItem {
    name?: string;
    name_de?: string;
    name_en?: string;
}
/**
 * Formats a display name by removing underscores and capitalizing words
 */
export declare function formatDisplayName(item: {
    name?: string;
    name_de?: string;
    name_en?: string;
} | null | undefined): string;
/**
 * Gets the localized name preferring German
 */
export declare function formatLocalizedName(item: LocalizedItem | null | undefined, fallback?: string): string;
/**
 * Translates common English terms to German
 */
export declare function translateToGerman(text: string): string;
/**
 * Formats medical classification choices for display
 */
export declare function formatMedicalChoice(choice: {
    name?: string;
    name_de?: string;
    name_en?: string;
    description?: string;
    description_de?: string;
    description_en?: string;
}): string;
/**
 * Helper function to get CSRF token for Django
 */
export declare function getCsrfToken(): string;
/**
 * Formats a patient's full name with age
 */
export declare function formatPatientDisplayName(patient: {
    first_name?: string;
    last_name?: string;
    dob?: string;
    age?: number;
}): string;
/**
 * Formats date for German locale
 */
export declare function formatGermanDate(dateString: string | Date): string;
/**
 * Formats date and time for German locale
 */
export declare function formatGermanDateTime(dateString: string | Date): string;
