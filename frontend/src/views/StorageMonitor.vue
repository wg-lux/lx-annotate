<template>
  <main class="container-fluid py-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h1 class="h3">Speicherüberwachungszentrum</h1>
        <p class="text-muted mb-0">
          Befunde, Videos und ihre gespeicherten Artefakte – einschließlich Dateien ohne
          Datenbankzuordnung.
        </p>
      </div>
      <button
        class="btn btn-primary"
        :disabled="loading || deleting"
        @click="refresh"
      >
        Aktualisieren
      </button>
    </div>
    <OverviewStorageSummary :key="capacity_revision" />
    <section
      class="card p-3"
      aria-label="Speicherinventar"
    >
      <form
        class="d-flex flex-wrap gap-3 align-items-end mb-3"
        @submit.prevent="search_inventory"
      >
        <label class="flex-grow-1"
          >Suche<input
            v-model="search"
            class="form-control"
            placeholder="Dateiname, Pfad, ID oder Hash"
        /></label>
        <label
          >Typ<select
            v-model="kind"
            class="form-select"
          >
            <option value="">Alle</option>
            <option value="video">Videos</option>
            <option value="report">Befunde</option>
            <option value="artifact">Artefakte</option>
            <option value="upload">Importaufträge</option>
          </select></label
        >
        <label
          >Status<select
            v-model="state"
            class="form-select"
          >
            <option value="">Alle Zustände</option>
            <option
              v-for="value in inventory?.states ?? []"
              :key="value"
            >
              {{ value }}
            </option>
          </select></label
        >
        <button
          class="btn btn-outline-primary mb-0"
          :disabled="loading || deleting"
        >
          Filtern
        </button>
      </form>
      <p
        v-if="error"
        class="alert alert-danger"
        role="alert"
      >
        {{ error }}
      </p>
      <p
        v-if="message"
        class="alert alert-info"
        role="status"
      >
        {{ message }}
      </p>
      <p
        v-if="loading"
        role="status"
      >
        Speicherinventar wird gelesen…
      </p>
      <template v-if="inventory">
        <div class="d-flex justify-content-between gap-3 align-items-center mb-2">
          <span
            >{{ inventory.total }} Ergebnisse · {{ format_bytes(inventory.bytes) }} erfasste
            Dateibytes insgesamt (unabhängig vom Filter)</span
          >
          <button
            v-if="inventory.administrator"
            class="btn btn-outline-danger mb-0"
            :disabled="!selected.length || deleting || loading"
            @click="confirming = true"
          >
            Auswahl löschen ({{ selected.length }})
          </button>
        </div>
        <p class="small text-muted">
          „Medium löschen“ entfernt den Datenbankeintrag und die durch dessen Löschdienst
          verwalteten Dateien. Einzelne zugeordnete Artefakte werden über ihr Medium gelöscht.
          Fehlende Dateien und Löschsperren bleiben sichtbar.
        </p>
        <div class="table-responsive">
          <table class="table table-hover align-middle">
            <caption class="visually-hidden">
              Medien und Dateien im lokalen Laufzeitspeicher
            </caption>
            <thead>
              <tr>
                <th>
                  <input
                    v-if="inventory.administrator"
                    v-model="all_selected"
                    type="checkbox"
                    :disabled="deleting || loading"
                    aria-label="Alle löschbaren Einträge dieser Seite auswählen"
                  /><span v-else>Auswahl</span>
                </th>
                <th>Datei / Medium</th>
                <th>Typ</th>
                <th>Zustand</th>
                <th>Größe</th>
                <th>Geändert</th>
                <th>Zuordnung und Details</th>
                <th>Löschumfang</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="entry in inventory.items"
                :key="entry.id"
              >
                <td>
                  <input
                    v-if="inventory.administrator && entry.token"
                    v-model="selected"
                    type="checkbox"
                    :value="entry.id"
                    :disabled="deleting || loading"
                    :aria-label="`${entry.name} auswählen`"
                  />
                </td>
                <td>
                  <strong>{{ entry.name }}</strong>
                  <div class="small text-muted text-break path">{{ entry.path || entry.id }}</div>
                </td>
                <td>{{ type_label(entry.kind) }}</td>
                <td>
                  <span class="badge bg-secondary text-wrap">{{ entry.status }}</span>
                </td>
                <td class="text-nowrap">
                  {{ entry.size === null ? '—' : format_bytes(entry.size) }}
                </td>
                <td>{{ entry.modified ? format_date(entry.modified) : '—' }}</td>
                <td>
                  <details>
                    <summary>Details ({{ entry.owners.length }} Verweise)</summary>
                    <ul v-if="entry.owners.length">
                      <li
                        v-for="owner in entry.owners"
                        :key="owner"
                      >
                        <button
                          class="btn btn-link p-0"
                          @click="show_owner(owner)"
                        >
                          {{ owner }}
                        </button>
                      </li>
                    </ul>
                    <dl>
                      <template
                        v-for="(value, key) in entry.details"
                        :key="key"
                        ><dt>{{ key }}</dt>
                        <dd class="text-break">{{ value }}</dd></template
                      >
                    </dl>
                  </details>
                </td>
                <td class="small">
                  {{
                    entry.blocker ||
                    (entry.kind === 'artifact'
                      ? 'Einzelne Datei löschen'
                      : entry.kind === 'upload'
                        ? 'Quelldateien löschen; Auftrag erhalten'
                        : 'Medium löschen')
                  }}
                </td>
              </tr>
              <tr v-if="!inventory.items.length">
                <td colspan="8">Keine passenden Einträge.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <nav
          class="d-flex gap-3 align-items-center"
          aria-label="Tabellenseiten"
        >
          <button
            class="btn btn-outline-secondary mb-0"
            :disabled="offset === 0 || loading || deleting"
            @click="change_page(-1)"
          >
            Zurück
          </button>
          <span
            >{{ inventory.total ? offset + 1 : 0 }}–{{
              Math.min(offset + limit, inventory.total)
            }}
            von {{ inventory.total }}</span
          >
          <button
            class="btn btn-outline-secondary mb-0"
            :disabled="offset + limit >= inventory.total || loading || deleting"
            @click="change_page(1)"
          >
            Weiter
          </button>
        </nav>
      </template>
    </section>
    <section
      v-if="confirming"
      ref="confirmation_panel"
      class="confirmation card border-danger p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-title"
      @keydown="confirmation_key"
    >
      <h2
        id="delete-title"
        class="h4"
      >
        Auswahl endgültig löschen?
      </h2>
      <p>
        Diese Aktion lässt sich nicht rückgängig machen. Bei Medien werden auch zugehörige Daten und
        verwaltete Dateien gelöscht.
      </p>
      <ul>
        <li
          v-for="entry in selected_entries"
          :key="entry.id"
        >
          {{ entry.name }} –
          {{
            entry.kind === 'artifact'
              ? entry.path
              : entry.kind === 'upload'
                ? 'Quelldateien; der Importauftrag bleibt erhalten'
                : 'gesamtes Medium einschließlich Datenbankeintrag'
          }}
        </li>
      </ul>
      <div class="d-flex gap-3">
        <button
          class="btn btn-secondary"
          :disabled="deleting"
          @click="confirming = false"
        >
          Abbrechen</button
        ><button
          class="btn btn-danger"
          :disabled="deleting"
          @click="remove_selected"
        >
          {{ deleting ? 'Löschung läuft…' : 'Endgültig löschen' }}
        </button>
      </div>
    </section>
  </main>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { isAxiosError } from 'axios'
import OverviewStorageSummary from '@/components/Anonymizer/OverviewStorageSummary.vue'
import { delete_entry, fetch_inventory, type StorageInventory } from '@/api/storageMonitor'
const inventory = ref<StorageInventory | null>(null)
const capacity_revision = ref(0)
const search = ref(''),
  kind = ref(''),
  state = ref(''),
  error = ref(''),
  message = ref('')
const offset = ref(0),
  limit = 100
const loading = ref(false),
  deleting = ref(false),
  confirming = ref(false)
const selected = ref<string[]>([])
const all_selected = computed({
  get: () => {
    const available = inventory.value?.items.filter((entry) => entry.token) ?? []
    return available.length > 0 && available.every((entry) => selected.value.includes(entry.id))
  },
  set: (checked: boolean) => {
    selected.value = checked
      ? (inventory.value?.items.filter((entry) => entry.token).map((entry) => entry.id) ?? [])
      : []
  }
})
const selected_entries = computed(
  () => inventory.value?.items.filter((entry) => selected.value.includes(entry.id)) ?? []
)
const confirmation_panel = ref<HTMLElement | null>(null)
watch(confirming, async (value) => {
  if (value) {
    await nextTick()
    confirmation_panel.value?.querySelector<HTMLButtonElement>('button')?.focus()
  }
})
function confirmation_key(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    if (!deleting.value) confirming.value = false
    return
  }
  if (event.key !== 'Tab') return
  const buttons =
    confirmation_panel.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
  if (!buttons?.length) {
    event.preventDefault()
    return
  }
  const first = buttons[0],
    last = buttons[buttons.length - 1]
  const boundary = event.shiftKey ? first : last
  if (document.activeElement === boundary) {
    event.preventDefault()
    ;(event.shiftKey ? last : first).focus()
  }
}
let controller: AbortController | null = null
let disposed = false
function format_bytes(size: number): string {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  const exponent = size > 0 ? Math.min(4, Math.floor(Math.log(size) / Math.log(1024))) : 0
  return `${(size / 1024 ** exponent).toLocaleString('de-DE', { maximumFractionDigits: 1 })} ${units[exponent]}`
}
function format_date(value: string): string {
  return new Date(value).toLocaleString('de-DE')
}
function type_label(value: string): string {
  return (
    { video: 'Video', report: 'Befund', artifact: 'Artefakt', upload: 'Importauftrag' }[value] ??
    value
  )
}
function inventory_error(err: unknown): string {
  return isAxiosError(err) && err.response?.status === 403
    ? 'Keine Berechtigung für das Speicherinventar.'
    : 'Speicherinventar konnte nicht vollständig geladen werden. Bitte erneut versuchen.'
}
async function refresh(): Promise<void> {
  controller?.abort()
  const current = new AbortController()
  controller = current
  loading.value = true
  error.value = ''
  selected.value = []
  confirming.value = false
  inventory.value = null
  try {
    const result = await fetch_inventory(
      { search: search.value, kind: kind.value, state: state.value, offset: offset.value, limit },
      current.signal
    )
    if (!disposed && controller === current) inventory.value = result
  } catch (err: unknown) {
    if (!current.signal.aborted && !disposed) error.value = inventory_error(err)
  } finally {
    if (controller === current) loading.value = false
  }
}
function search_inventory(): void {
  offset.value = 0
  void refresh()
}
function change_page(direction: number): void {
  offset.value += direction * limit
  void refresh()
}
function show_owner(owner: string): void {
  search.value = owner
  kind.value = ''
  state.value = ''
  search_inventory()
}
async function remove_selected(): Promise<void> {
  if (deleting.value) return
  deleting.value = true
  const entries = [...selected_entries.value]
  let completed = 0
  const failed: string[] = []
  for (const entry of entries) {
    try {
      await delete_entry(entry.token)
      completed++
    } catch {
      failed.push(entry.name)
    }
  }
  deleting.value = false
  confirming.value = false
  if (completed > 0) capacity_revision.value += 1
  message.value = `${String(completed)} Löschaktionen erfolgreich.${failed.length ? ` Nicht gelöscht: ${failed.join(', ')}. Bestand aktualisieren und Sperren prüfen.` : ''}`
  if (!disposed) await refresh()
}
onMounted(refresh)
onUnmounted(() => {
  disposed = true
  controller?.abort()
})
</script>
<style scoped>
.path {
  max-width: 28rem;
}
.confirmation {
  position: fixed;
  z-index: 1050;
  inset: 15% 15% auto;
  max-height: 75vh;
  overflow: auto;
  box-shadow: 0 0 0 100vmax #0008;
}
</style>
