/**
 * Formats a display name by removing underscores and capitalizing words
 */
export function formatDisplayName(item) {
    if (!item)
        return 'Unbekannt';
    // Prefer German name, then fallback to English or default name
    const name = item.name_de || item.name_en || item.name || 'Unbekannt';
    return name
        .replace(/_/g, ' ') // Replace underscores with spaces
        .replace(/\b\w/g, (char) => char.toUpperCase()) // Capitalize first letter of each word
        .trim();
}
/**
 * Gets the localized name preferring German
 */
export function formatLocalizedName(item, fallback = 'Unbekannt') {
    if (!item)
        return fallback;
    const name = item.name_de || item.name_en || item.name || fallback;
    return formatDisplayName({ name });
}
/**
 * Translates common English terms to German
 */
export function translateToGerman(text) {
    const translations = {
        // Status translations
        planned: 'Geplant',
        in_progress: 'In Bearbeitung',
        completed: 'Abgeschlossen',
        cancelled: 'Abgebrochen',
        active: 'Aktiv',
        inactive: 'Inaktiv',
        // Common medical terms
        location: 'Lokalisation',
        morphology: 'Morphologie',
        finding: 'Befund',
        examination: 'Untersuchung',
        patient: 'Patient',
        notes: 'Notizen',
        date: 'Datum',
        time: 'Zeit',
        required: 'Erforderlich',
        optional: 'Optional',
        // Anatomical terms
        upper: 'Oberer',
        lower: 'Unterer',
        left: 'Links',
        right: 'Rechts',
        anterior: 'Vorderer',
        posterior: 'Hinterer',
        medial: 'Medial',
        lateral: 'Lateral',
        proximal: 'Proximal',
        distal: 'Distal',
        // Size/severity terms
        small: 'Klein',
        medium: 'Mittel',
        large: 'Groß',
        mild: 'Leicht',
        moderate: 'Mäßig',
        severe: 'Schwer',
        // Common descriptors
        normal: 'Normal',
        abnormal: 'Abnormal',
        positive: 'Positiv',
        negative: 'Negativ',
        unknown: 'Unbekannt',
        other: 'Andere',
        multiple: 'Mehrfach',
        single: 'Einzeln'
    };
    // Try exact match first
    const exactMatch = translations[text.toLowerCase()];
    if (exactMatch)
        return exactMatch;
    // Try to translate individual words and format
    const words = text.split(/[_\s]+/);
    const translatedWords = words.map((word) => {
        const translation = translations[word.toLowerCase()];
        return translation || word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
    return translatedWords.join(' ');
}
/**
 * Formats medical classification choices for display
 */
export function formatMedicalChoice(choice) {
    const name = formatLocalizedName(choice);
    const description = choice.description_de || choice.description_en || choice.description;
    if (description && description !== name) {
        return `${name} (${description})`;
    }
    return name;
}
/**
 * Helper function to get CSRF token for Django
 */
export function getCsrfToken() {
    const token = document.querySelector('[name=csrfmiddlewaretoken]');
    return token?.value || '';
}
/**
 * Formats a patient's full name with age
 */
export function formatPatientDisplayName(patient) {
    const firstName = patient.first_name || '';
    const lastName = patient.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Unbekannter Patient';
    let ageText = '';
    if (patient.age !== undefined && patient.age !== null) {
        ageText = ` (${patient.age} Jahre)`;
    }
    else if (patient.dob) {
        try {
            const birthDate = new Date(patient.dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            ageText = ` (${age} Jahre)`;
        }
        catch {
            // Invalid date, skip age
        }
    }
    return fullName + ageText;
}
/**
 * Formats date for German locale
 */
export function formatGermanDate(dateString) {
    try {
        const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
        return date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }
    catch {
        return 'Ungültiges Datum';
    }
}
/**
 * Formats date and time for German locale
 */
export function formatGermanDateTime(dateString) {
    try {
        const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
        return date.toLocaleString('de-DE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    catch {
        return 'Ungültiges Datum';
    }
}
