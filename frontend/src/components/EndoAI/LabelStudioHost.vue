<template>
  <div class="ls-container">
    <div v-if="isLoading" class="loader">Loading task...</div>
    <div v-else-if="!queueStore.selectedLabelGroupId" class="empty-state">
      Select a label group to start annotating.
    </div>
    <div v-else-if="!currentTask" class="empty-state">
      No annotation tasks available.
    </div>
    <div ref="lsRoot" class="label-studio-root" />
  </div>
</template>

<script setup lang="ts">
import { markRaw, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'
import { useAnnotationQueueStore, type AnnotationTask } from '@/stores/annotationQueue'
import { useAuthKcStore } from '@/stores/auth_kc'
import { resolveAnnotator, toBulkUpsertPayload } from '@/utils/annotationAdapter'
import { getStaticUrl } from '@/utils/getStaticUrl'

type LabelStudioCtor = new (
  root: string | HTMLElement,
  options: Record<string, unknown>
) => any

type LabelStudioTaskAnnotation = {
  serializeAnnotation?: () => unknown[]
  result?: unknown[]
}

const lsRoot = ref<HTMLElement | null>(null)
const queueStore = useAnnotationQueueStore()
const authStore = useAuthKcStore()

const isLoading = ref(true)
const currentTask = ref<AnnotationTask | null>(null)

const LABEL_STUDIO_VERSION = '1.11.0'
const LABEL_STUDIO_SCRIPT_PATH = `@humansignal/label-studio@${LABEL_STUDIO_VERSION}/build/static/js/main.js`
const LABEL_STUDIO_STYLE_PATH = `@humansignal/label-studio@${LABEL_STUDIO_VERSION}/build/static/css/main.css`
const LABEL_STUDIO_SCRIPT_SOURCES = [
  `https://unpkg.com/${LABEL_STUDIO_SCRIPT_PATH}`,
  `https://cdn.jsdelivr.net/npm/${LABEL_STUDIO_SCRIPT_PATH}`
]
const LABEL_STUDIO_STYLE_SOURCES = [
  `https://unpkg.com/${LABEL_STUDIO_STYLE_PATH}`,
  `https://cdn.jsdelivr.net/npm/${LABEL_STUDIO_STYLE_PATH}`
]

let lsInstance: any | null = null
let initCycle = 0
let labelStudioScriptPromise: Promise<void> | null = null
let resolvedLabelStudioScriptSrc: string | null = null
let resolvedLabelStudioStyleHref: string | null = null

function hasNestedResultArray(value: unknown): value is { result: unknown[] } {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Array.isArray((value as { result?: unknown[] }).result)
  )
}

function getAnnotatorPrincipal(): string {
  const rawUser = authStore.user as Record<string, unknown> | null
  const sub =
    typeof rawUser?.sub === 'string'
      ? rawUser.sub
      : typeof rawUser?.oidcSub === 'string'
        ? rawUser.oidcSub
        : null

  return resolveAnnotator({
    sub,
    username: authStore.user?.username ?? null
  })
}

function destroyLabelStudio(invalidate = true): void {
  if (invalidate) initCycle += 1
  if (lsInstance) {
    try {
      lsInstance.destroy?.()
    } catch {
      // Ignore cleanup errors from third-party widget teardown.
    }
    lsInstance = null
  }
  if (lsRoot.value) {
    lsRoot.value.innerHTML = ''
  }
}

function buildStaticAssetUrl(path: string): string {
  return getStaticUrl(path)
}

function getScriptSources(): string[] {
  return [buildStaticAssetUrl(`vendor/label-studio/${LABEL_STUDIO_SCRIPT_PATH}`), ...LABEL_STUDIO_SCRIPT_SOURCES]
}

function getStyleSources(): string[] {
  return [buildStaticAssetUrl(`vendor/label-studio/${LABEL_STUDIO_STYLE_PATH}`), ...LABEL_STUDIO_STYLE_SOURCES]
}

function loadStyle(href: string): Promise<void> {
  const existing = document.querySelector(`link[href="${href}"]`) as HTMLLinkElement | null
  if (existing) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.onload = () => resolve()
    link.onerror = () => reject(new Error(`Failed to load stylesheet: ${href}`))
    document.head.appendChild(link)
  })
}

function loadScript(src: string): Promise<void> {
  const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null
  if (existing) {
    if ((window as Window & { LabelStudio?: unknown }).LabelStudio) return Promise.resolve()
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true })
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

async function loadLabelStudioAssets(): Promise<void> {
  if (resolvedLabelStudioScriptSrc) {
    if (resolvedLabelStudioStyleHref) {
      await loadStyle(resolvedLabelStudioStyleHref)
    }
    await loadScript(resolvedLabelStudioScriptSrc)
    return
  }

  const scriptSources = getScriptSources()
  const styleSources = getStyleSources()
  const errors: string[] = []

  for (let idx = 0; idx < scriptSources.length; idx += 1) {
    const scriptSrc = scriptSources[idx]
    const styleHref = styleSources[idx] ?? styleSources[styleSources.length - 1]
    try {
      await loadStyle(styleHref)
      await loadScript(scriptSrc)
      resolvedLabelStudioStyleHref = styleHref
      resolvedLabelStudioScriptSrc = scriptSrc
      return
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${scriptSrc} -> ${message}`)
    }
  }

  throw new Error(`Failed to load Label Studio assets. Attempts: ${errors.join(' | ')}`)
}

async function loadLabelStudioCtor(): Promise<LabelStudioCtor> {
  if (!labelStudioScriptPromise) {
    labelStudioScriptPromise = loadLabelStudioAssets()
  }

  try {
    await labelStudioScriptPromise
  } catch (error) {
    labelStudioScriptPromise = null
    throw error
  }

  const ctor = (window as Window & { LabelStudio?: LabelStudioCtor }).LabelStudio
  if (!ctor) {
    throw new Error('Label Studio global was not found on window after script load.')
  }
  return ctor
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function generateXmlConfig(groupId: string): string {
  const targetLabel = queueStore.targetLabelName?.trim() || `Group ${groupId} Label`
  const safeTargetLabel = escapeXml(targetLabel)

  return `<View>
    <Image name="image" value="$image" />
    <Header value="Annotate '${safeTargetLabel}' for this frame" />
    <Choices name="choice" toName="image" choice="single-radio" showInline="true">
      <Choice value="${safeTargetLabel}: present" />
      <Choice value="${safeTargetLabel}: absent" />
    </Choices>
  </View>`
}

async function handleUpsert(
  annotation: LabelStudioTaskAnnotation,
  task: AnnotationTask
): Promise<void> {
  const serializedRaw =
    typeof annotation.serializeAnnotation === 'function'
      ? annotation.serializeAnnotation()
      : annotation.result
  const nestedResult = hasNestedResultArray(serializedRaw) ? serializedRaw.result : []
  const serialized = Array.isArray(serializedRaw) ? serializedRaw : nestedResult

  const payload = toBulkUpsertPayload(
    serialized,
    task.data.frameId,
    getAnnotatorPrincipal(),
    task.data.existingExternalId
  )

  await axiosInstance.post(r(endpoints.annotation.bulkUpsert), [payload])
}

async function handleSkip(task: AnnotationTask): Promise<void> {
  await axiosInstance.post(r(endpoints.annotation.skip), {
    frameId: task.data.frameId,
    annotator: getAnnotatorPrincipal()
  })
}

async function initializeLabelStudio(): Promise<void> {
  const currentCycle = ++initCycle
  isLoading.value = true

  destroyLabelStudio(false)

  if (!queueStore.selectedLabelGroupId) {
    currentTask.value = null
    isLoading.value = false
    return
  }

  if (!queueStore.taskQueue.length) {
    await queueStore.fetchBatch(10)
  }

  if (currentCycle !== initCycle) return

  const task = queueStore.popNextTask() || null
  currentTask.value = task
  if (!task) {
    isLoading.value = false
    return
  }

  if (!lsRoot.value) {
    isLoading.value = false
    return
  }

  try {
    const LabelStudioClass = await loadLabelStudioCtor()
    if (currentCycle !== initCycle) return

    const xmlConfig = generateXmlConfig(queueStore.selectedLabelGroupId)
    const instance = new LabelStudioClass(lsRoot.value, {
      config: xmlConfig,
      interfaces: ['panel', 'update', 'submit', 'skip', 'controls'],
      user: { pk: 1, firstName: authStore.user?.username ?? 'unknown', lastName: '' },
      task: {
        annotations: [],
        predictions: [],
        id: task.id,
        data: {
          image: task.data.imageUrl
        }
      },
      onSubmitAnnotation: async (_ls: unknown, annotation: LabelStudioTaskAnnotation) => {
        try {
          await handleUpsert(annotation, task)
          await initializeLabelStudio()
        } catch (error) {
          console.error('Failed to submit annotation.', error)
        }
      },
      onUpdateAnnotation: async (_ls: unknown, annotation: LabelStudioTaskAnnotation) => {
        try {
          await handleUpsert(annotation, task)
          await initializeLabelStudio()
        } catch (error) {
          console.error('Failed to update annotation.', error)
        }
      },
      onSkipTask: async () => {
        try {
          await handleSkip(task)
          await initializeLabelStudio()
        } catch (error) {
          console.error('Failed to skip task.', error)
        }
      }
    })

    if (currentCycle !== initCycle) {
      instance.destroy?.()
      return
    }

    lsInstance = markRaw(instance)
    isLoading.value = false
  } catch (error) {
    console.error('Failed to initialize Label Studio.', error)
    if (currentCycle === initCycle) {
      isLoading.value = false
    }
  }
}

watch(
  () => [queueStore.selectedLabelGroupId, queueStore.taskQuerySignature],
  async () => {
    queueStore.clearQueue()
    if (!queueStore.selectedLabelGroupId) {
      destroyLabelStudio()
      currentTask.value = null
      isLoading.value = false
      return
    }
    await queueStore.fetchBatch(10)
    await initializeLabelStudio()
  }
)

onMounted(async () => {
  if (!queueStore.selectedLabelGroupId) {
    isLoading.value = false
    return
  }

  await queueStore.fetchBatch(10)
  await initializeLabelStudio()
})

onBeforeUnmount(() => {
  destroyLabelStudio()
})
</script>

<style scoped>
.ls-container {
  min-height: 320px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  background: #fff;
  position: relative;
}

.label-studio-root {
  min-height: 320px;
  height: 80vh;
  overflow: hidden;
}

.loader,
.empty-state {
  padding: 16px;
  color: #6c757d;
  font-size: 14px;
}
</style>
