import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
function makeKey(scope, id) {
    return `${scope}:${id}`;
}
/* ------------------------------------------------------------------ */
/* Store Definition                                                   */
/* ------------------------------------------------------------------ */
export const useMediaTypeStore = defineStore('mediaType', () => {
    // Current “focused” item (usually set before navigating)
    const currentItem = ref(null);
    // Registries
    const typeByKey = ref(new Map());
    const itemsByKey = ref(new Map());
    /* ----------------------------- Seeding --------------------------- */
    // Call this once after fetchOverview() in the overview component
    function seedTypesFromOverview(items) {
        for (const it of items) {
            const raw = (it.mediaType ?? '').toLowerCase();
            const m = raw === 'pdf' ? 'pdf' :
                raw === 'video' ? 'video' : 'unknown';
            if (m !== 'unknown')
                rememberType(it.id, m, m);
        }
    }
    /* ------------------------- Type registry ------------------------- */
    function rememberType(id, type, scope) {
        const s = scope ?? type ?? 'unknown';
        // allow storing by scope even if type is unknown (but don’t store an 'unknown' type value)
        if (s === 'unknown')
            return;
        const key = makeKey(s, id);
        // If type is unknown, don’t overwrite an existing concrete type
        const existing = typeByKey.value.get(key);
        const toStore = type === 'unknown' ? (existing ?? 'unknown') : type;
        if (toStore === 'unknown')
            return;
        typeByKey.value.set(key, toStore);
        try {
            sessionStorage.setItem(`mediaType:${key}`, toStore);
        }
        catch { }
    }
    function getType(id, scope) {
        if (scope) {
            const key = makeKey(scope, id);
            const m = typeByKey.value.get(key);
            if (m)
                return m;
            try {
                const fromSession = sessionStorage.getItem(`mediaType:${key}`);
                console.log('from session storage:', fromSession);
                if (fromSession) {
                    typeByKey.value.set(key, fromSession);
                    return fromSession;
                }
            }
            catch { }
            return 'unknown';
        }
        else {
            return 'unknown';
        }
    }
    function setCurrentByKey(scope, id) {
        const type = getType(id, scope);
        setCurrentItem({ id, scope, mediaType: type });
        console.log(`MediaTypeStore: setCurrentByKey(${scope}, ${id}) → type=${type}`);
        console.log(`CurrentItem:`, currentItem.value);
    }
    function getAllTypes(id) {
        const out = new Set();
        for (const s of ['video', 'pdf', 'meta']) {
            const t = getType(id, s);
            if (t && t !== 'unknown')
                out.add(t);
        }
        return [...out];
    }
    function resolveType(id, hint) {
        const types = getAllTypes(id);
        if (types.length === 1)
            return types[0];
        if (types.length > 1) {
            if (hint === 'prefer-video' && types.includes('video'))
                return 'video';
            if (hint === 'prefer-pdf' && types.includes('pdf'))
                return 'pdf';
        }
        return 'unknown';
    }
    /* ----------------------- Item/URL registry ----------------------- */
    function setItem(scope, item) {
        const key = makeKey(scope, item.id);
        itemsByKey.value.set(key, { ...item, scope });
    }
    function getItem(scope, id) {
        const key = makeKey(scope, id);
        return itemsByKey.value.get(key);
    }
    function getRawStreamUrl(scope, id) {
        return getItem(scope, id)?.rawStreamUrl;
    }
    function getProcessedStreamUrl(scope, id) {
        return getItem(scope, id)?.processedStreamUrl;
    }
    /* ---------------------------- Config ----------------------------- */
    const mediaTypeConfigs = {
        pdf: { icon: 'fas fa-file-pdf text-danger', badgeClass: 'bg-danger', displayName: 'PDF', supportedExtensions: ['.pdf'] },
        video: { icon: 'fas fa-video text-primary', badgeClass: 'bg-primary', displayName: 'Video', supportedExtensions: ['.mp4', '.avi', '.mov', '.mkv', '.webm'] },
        unknown: { icon: 'fas fa-question-circle text-muted', badgeClass: 'bg-secondary', displayName: 'Unbekannt', supportedExtensions: [] }
    };
    /* --------------------------- Computed ---------------------------- */
    const currentMediaType = computed(() => {
        const ci = currentItem.value;
        if (!ci)
            return 'unknown';
        return detectMediaType(ci);
    });
    const isPdf = computed(() => currentMediaType.value === 'pdf');
    const isVideo = computed(() => currentMediaType.value === 'video');
    const isUnknown = computed(() => currentMediaType.value === 'unknown');
    const currentMediaConfig = computed(() => mediaTypeConfigs[currentMediaType.value]);
    /* ---------------------------- Methods ---------------------------- */
    // Keep this pure; no fetching or IO here.
    function detectMediaType(item) {
        if (item.mediaType && item.mediaType !== 'unknown')
            return item.mediaType;
        // 1) If scope is known, prefer the registry `(scope,id)`
        if (item.scope && item.scope !== 'unknown') {
            const byScoped = getType(item.id, item.scope);
            console.log('Registry Value:', byScoped);
            if (byScoped !== 'unknown')
                return byScoped;
        }
        // 2) Try explicit field
        // 3) try by filename
        if (item.filename) {
            const ext = `.${item.filename.toLowerCase().split('.').pop() || ''}`;
            if (mediaTypeConfigs.video.supportedExtensions.includes(ext))
                return 'video';
            if (mediaTypeConfigs.pdf.supportedExtensions.includes(ext))
                return 'pdf';
        }
        // 3) Ambiguous registry lookup by id
        const remembered = getType(item.id);
        if (remembered !== 'unknown')
            return remembered;
        return 'unknown';
    }
    function setCurrentItem(item) {
        currentItem.value = item;
    }
    function updateCurrentItem(updates) {
        if (currentItem.value)
            currentItem.value = { ...currentItem.value, ...updates };
    }
    function clearCurrentItem() {
        currentItem.value = null;
    }
    function getMediaTypeConfig(mediaType) {
        return mediaTypeConfigs[mediaType];
    }
    function isSupportedExtension(filename) {
        const ext = `.${filename.toLowerCase().split('.').pop() || ''}`;
        return Object.values(mediaTypeConfigs).some(c => c.supportedExtensions.includes(ext));
    }
    // Legacy compatibility (icons/badges)
    function getMediaTypeIcon(mediaType) {
        return mediaTypeConfigs[mediaType]?.icon || mediaTypeConfigs.unknown.icon;
    }
    function getMediaTypeBadgeClass(mediaType) {
        return mediaTypeConfigs[mediaType]?.badgeClass || mediaTypeConfigs.unknown.badgeClass;
    }
    return {
        // State
        currentItem,
        // Computed
        currentMediaType,
        isPdf,
        isVideo,
        isUnknown,
        currentMediaConfig,
        // Type registry
        seedTypesFromOverview,
        rememberType,
        getType,
        setCurrentByKey,
        getAllTypes,
        resolveType,
        // Item registry
        setItem,
        getItem,
        getRawStreamUrl,
        getProcessedStreamUrl,
        // Utils
        detectMediaType,
        setCurrentItem,
        updateCurrentItem,
        clearCurrentItem,
        getMediaTypeConfig,
        isSupportedExtension,
        getMediaTypeIcon,
        getMediaTypeBadgeClass,
    };
});
