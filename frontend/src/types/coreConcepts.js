export const getCoreConceptDisplayName = (concept, fallback = 'unknown') => concept?.displayName || concept?.nameDe || concept?.nameEn || concept?.name || fallback;
