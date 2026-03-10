const DEFAULT_STATIC_URL = '/static/';
export function normalizeStaticUrl(value) {
    if (typeof value !== 'string' || value.trim() === '') {
        return DEFAULT_STATIC_URL;
    }
    return value.endsWith('/') ? value : `${value}/`;
}
export function getStaticUrl(path = '') {
    const base = typeof window !== 'undefined'
        ? normalizeStaticUrl(window.STATIC_URL)
        : DEFAULT_STATIC_URL;
    const normalizedPath = path.replace(/^\/+/, '');
    return normalizedPath ? `${base}${normalizedPath}` : base;
}
