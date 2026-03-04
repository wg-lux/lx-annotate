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
const LABEL_STUDIO_SCRIPT_SRC = `https://unpkg.com/@humansignal/label-studio@${LABEL_STUDIO_VERSION}/build/static/js/main.js`
const LABEL_STUDIO_STYLE_HREF = `https://unpkg.com/@humansignal/label-studio@${LABEL_STUDIO_VERSION}/build/static/css/main.css`

let lsInstance: any | null = null
let initCycle = 0
let labelStudioScriptPromise: Promise<void> | null = null

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

function loadStyle(href: string): void {
  if (document.querySelector(`link[href="${href}"]`)) return

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
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

async function loadLabelStudioCtor(): Promise<LabelStudioCtor> {
  loadStyle(LABEL_STUDIO_STYLE_HREF)

  if (!labelStudioScriptPromise) {
    labelStudioScriptPromise = loadScript(LABEL_STUDIO_SCRIPT_SRC)
  }

  await labelStudioScriptPromise

  const ctor = (window as Window & { LabelStudio?: LabelStudioCtor }).LabelStudio
  if (!ctor) {
    throw new Error('Label Studio global was not found on window after script load.')
  }
  return ctor
}

function generateXmlConfig(groupId: string): string {
  return `<View>
    <Image name="image" value="$image" />
    <Choices name="choice" toName="image" showInline="true">
      <Choice value="Example Label for Group ${groupId}" />
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
  () => queueStore.selectedLabelGroupId,
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
