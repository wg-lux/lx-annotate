import { defineStore } from 'pinia'
import { computed, ref, type ComputedRef } from 'vue'
import { createRuntimeLogger } from '@/utils/runtimeLogger'

const logger = createRuntimeLogger('media-type-store')

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type MediaScope = 'pdf' | 'video' | 'meta' | 'unknown'
export type MediaKey = `${MediaScope}:${number}`
export type MediaType = 'pdf' | 'video' | 'unknown'

export type MediaItem = {
  id: number
  scope?: MediaScope
  mediaType?: MediaType
  filename?: string
  rawStreamUrl?: string
  processedStreamUrl?: string
}

type MediaTypeConfig = {
  icon: string
  badgeClass: string
  displayName: string
  supportedExtensions: string[]
}

function makeKey(scope: MediaScope, id: number): MediaKey {
  if (!Number.isSafeInteger(id) || id < 0) {
    throw new TypeError('Media key requires a non-negative integer identifier')
  }
  const key = [scope, String(id)].join(':')
  if (!isMediaKey(key)) {
    throw new TypeError('Media key does not match the canonical format')
  }
  return key
}

function isMediaKey(value: string): value is MediaKey {
  return /^(?:pdf|video|meta|unknown):\d+$/.test(value)
}

function isMediaType(value: unknown): value is MediaType {
  return value === 'pdf' || value === 'video' || value === 'unknown'
}

/* ------------------------------------------------------------------ */
/* Store Definition                                                   */
/* ------------------------------------------------------------------ */

export const useMediaTypeStore = defineStore('mediaType', () => {
  // Current “focused” item (usually set before navigating)
  const currentItem = ref<MediaItem | null>(null)

  // Registries
  const typeByKey = ref<Map<MediaKey, MediaType>>(new Map())
  const itemsByKey = ref<Map<MediaKey, MediaItem>>(new Map())

  /* ----------------------------- Seeding --------------------------- */

  // Call this once after fetchOverview() in the overview component
  function seedTypesFromOverview(items: Array<{ id: number; mediaType?: string }>) {
    for (const overviewItem of items) {
      const rawMediaType = (overviewItem.mediaType ?? '').toLowerCase()
      const mediaType: MediaType = rawMediaType === 'pdf' ? 'pdf' : rawMediaType === 'video' ? 'video' : 'unknown'
      if (mediaType !== 'unknown') {
        rememberType(overviewItem.id, mediaType, mediaType)
      }
    }
  }

  /* ------------------------- Type registry ------------------------- */

  function rememberType(id: number, type: MediaType, scope?: MediaScope) {
    const mediaScope: MediaScope = scope ?? type
    // allow storing by scope even if type is unknown (but don’t store an 'unknown' type value)
    if (mediaScope === 'unknown') {
      return
    }

    const key = makeKey(mediaScope, id)
    // If type is unknown, don’t overwrite an existing concrete type
    const existing = typeByKey.value.get(key)
    const toStore: MediaType = type === 'unknown' ? (existing ?? 'unknown') : type
    if (toStore === 'unknown') {
      return
    }

    typeByKey.value.set(key, toStore)
    try {
      sessionStorage.setItem(`mediaType:${key}`, toStore)
    } catch {
      // Session persistence is optional; the in-memory registry remains authoritative.
    }
  }

  function getType(id: number, scope?: MediaScope): MediaType {
    if (scope) {
      const key = makeKey(scope, id)
      const mediaType = typeByKey.value.get(key)
      if (mediaType) {
        return mediaType
      }
      try {
        const fromSession: unknown = sessionStorage.getItem(`mediaType:${key}`)
        logger.debug('session-type-read', {
          operation: 'read',
          outcome: isMediaType(fromSession) ? 'accepted' : 'ignored'
        })
        if (isMediaType(fromSession)) {
          typeByKey.value.set(key, fromSession)
          return fromSession
        }
      } catch {
        // Missing or inaccessible session storage falls back to an unknown media type.
      }
      return 'unknown'
    } else {
      return 'unknown'
    }
  }

  function setCurrentByKey(scope: MediaScope, id: number) {
    const type = getType(id, scope)
    setCurrentItem({ id, scope, mediaType: type })
    logger.debug('current-item-selected', {
      operation: 'select',
      mediaType: type
    })
    logger.debug('current-item-state-updated', { state: 'selected' })
  }

  function getAllTypes(id: number): MediaType[] {
    const mediaTypes = new Set<MediaType>()
    const scopes: MediaScope[] = ['video', 'pdf', 'meta']
    for (const mediaScope of scopes) {
      const mediaType = getType(id, mediaScope)
      if (mediaType !== 'unknown') {
        mediaTypes.add(mediaType)
      }
    }
    return [...mediaTypes]
  }

  function resolveType(id: number, hint?: 'prefer-video' | 'prefer-pdf'): MediaType {
    const types = getAllTypes(id)
    if (types.length === 1) {
      return types[0]
    }
    if (types.length > 1) {
      if (hint === 'prefer-video' && types.includes('video')) {
        return 'video'
      }
      if (hint === 'prefer-pdf' && types.includes('pdf')) {
        return 'pdf'
      }
    }
    return 'unknown'
  }

  /* ----------------------- Item/URL registry ----------------------- */

  function setItem(scope: MediaScope, item: MediaItem) {
    const key = makeKey(scope, item.id)
    itemsByKey.value.set(key, { ...item, scope })
  }

  function getItem(scope: MediaScope, id: number): MediaItem | undefined {
    const key = makeKey(scope, id)
    return itemsByKey.value.get(key)
  }

  function getRawStreamUrl(scope: MediaScope, id: number): string | undefined {
    return getItem(scope, id)?.rawStreamUrl
  }

  function getProcessedStreamUrl(scope: MediaScope, id: number): string | undefined {
    return getItem(scope, id)?.processedStreamUrl
  }

  /* ---------------------------- Config ----------------------------- */

  const mediaTypeConfigs: Record<MediaType, MediaTypeConfig> = {
    pdf: {
      icon: 'ni ni-single-copy-04 text-danger',
      badgeClass: 'bg-danger',
      displayName: 'PDF',
      supportedExtensions: ['.pdf']
    },
    video: {
      icon: 'ni ni-button-play text-primary',
      badgeClass: 'bg-primary',
      displayName: 'Video',
      supportedExtensions: ['.mp4', '.avi', '.mov', '.mkv', '.webm']
    },
    unknown: {
      icon: 'ni ni-user-run text-muted',
      badgeClass: 'bg-secondary',
      displayName: 'Unbekannt',
      supportedExtensions: []
    }
  }

  /* --------------------------- Computed ---------------------------- */

  const currentMediaType: ComputedRef<MediaType> = computed(() => {
    const focusedItem = currentItem.value
    if (!focusedItem) {
      return 'unknown'
    }
    return detectMediaType(focusedItem)
  })

  const isPdf = computed(() => currentMediaType.value === 'pdf')
  const isVideo = computed(() => currentMediaType.value === 'video')
  const isUnknown = computed(() => currentMediaType.value === 'unknown')

  const currentMediaConfig = computed(() => mediaTypeConfigs[currentMediaType.value])

  /* ---------------------------- Methods ---------------------------- */

  // Keep this pure; no fetching or IO here.
  function detectMediaType(item: MediaItem): MediaType {
    if (item.mediaType && item.mediaType !== 'unknown') {
      return item.mediaType
    }
    // 1) If scope is known, prefer the registry `(scope,id)`
    if (item.scope && item.scope !== 'unknown') {
      const byScoped = getType(item.id, item.scope)
      logger.debug('registry-type-resolved', {
        operation: 'resolve',
        mediaType: byScoped
      })
      if (byScoped !== 'unknown') {
        return byScoped
      }
    }

    // 2) Try explicit field

    // 3) try by filename
    if (item.filename) {
      const extension = `.${item.filename.toLowerCase().split('.').pop() || ''}`
      if (mediaTypeConfigs.video.supportedExtensions.includes(extension)) {
        return 'video'
      }
      if (mediaTypeConfigs.pdf.supportedExtensions.includes(extension)) {
        return 'pdf'
      }
    }
    // 3) Ambiguous registry lookup by id
    const remembered = getType(item.id)
    if (remembered !== 'unknown') {
      return remembered
    }

    return 'unknown'
  }

  function setCurrentItem(item: MediaItem | null): void {
    currentItem.value = item
  }

  function updateCurrentItem(updates: Partial<MediaItem>): void {
    if (currentItem.value) {
      currentItem.value = { ...currentItem.value, ...updates }
    }
  }

  function clearCurrentItem(): void {
    currentItem.value = null
  }

  function getMediaTypeConfig(mediaType: MediaType): MediaTypeConfig {
    return mediaTypeConfigs[mediaType]
  }

  function isSupportedExtension(filename: string): boolean {
    const extension = `.${filename.toLowerCase().split('.').pop() || ''}`
    return Object.values(mediaTypeConfigs).some((c) => c.supportedExtensions.includes(extension))
  }

  // Legacy compatibility (icons/badges)
  function getMediaTypeIcon(mediaType: MediaType): string {
    return mediaTypeConfigs[mediaType].icon
  }
  function getMediaTypeBadgeClass(mediaType: MediaType): string {
    return mediaTypeConfigs[mediaType].badgeClass
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
    getMediaTypeBadgeClass
  }
})
