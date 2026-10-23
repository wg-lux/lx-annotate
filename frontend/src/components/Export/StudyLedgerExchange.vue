<template>
  <section
    class="card card-body"
    aria-labelledby="ledger-title"
  >
    <h2
      id="ledger-title"
      class="h5"
    >
      Gespeicherte Studiendaten
    </h2>
    <p>
      Exportiert gespeicherte Ledger-Einträge, Bewertungen, Studienregeln und die verwendeten
      Datenmodelle. Die Datei enthält pseudonyme Forschungsdaten und muss geschützt aufbewahrt
      werden.
    </p>
    <label for="ledger-study">Studie</label>
    <select
      id="ledger-study"
      v-model="selected"
      class="form-select mb-2"
      :disabled="busy"
    >
      <option value="">Studie auswählen</option>
      <option
        v-for="study in studies"
        :key="study.uuid"
        :value="study.uuid"
      >
        {{ study.name }}
      </option>
    </select>
    <button
      class="btn btn-primary"
      :disabled="busy || !selected"
      @click="download"
    >
      Ledger als Excel herunterladen
    </button>
    <details class="my-3">
      <summary>Studienledger an Hub übertragen</summary>
      <label for="ledger-source">Quellknoten</label>
      <input
        id="ledger-source"
        v-model="sourceNodeKey"
        class="form-control mb-2"
        :disabled="busy"
      />
      <label for="ledger-target">Zielknoten (leer: konfigurierter Hub)</label>
      <input
        id="ledger-target"
        v-model="targetNodeKey"
        class="form-control mb-2"
        :disabled="busy"
      />
      <button
        class="btn btn-outline-primary"
        :disabled="busy || !selected || !sourceNodeKey.trim()"
        @click="sendToHub"
      >
        An Hub übertragen
      </button>
    </details>
    <details class="my-3">
      <summary>Empfangenen Hub-Transfer übernehmen</summary>
      <label for="ledger-transfer">Transfer-UUID aus dem Empfangsbeleg</label>
      <input
        id="ledger-transfer"
        v-model="transferId"
        class="form-control mb-2"
        :disabled="busy"
      />
      <button
        class="btn btn-outline-primary"
        :disabled="busy || !transferId.trim()"
        @click="acceptTransfer"
      >
        Studienledger übernehmen
      </button>
    </details>
    <hr />
    <h3 class="h6">LX-Studienexport wieder importieren</h3>
    <p>
      Übernimmt gespeicherte Datensammlungen aus einer LX-Datei. Die verwendeten Datenmodelle müssen
      installiert und die Untersuchungs-UUIDs bereits vorhanden und zugänglich sein. Bearbeitete Anzeigetabellen werden beim Import abgewiesen; eigene Tabellen benötigen eine Spaltenzuordnung.
    </p>
    <input
      aria-label="LX-Studienarbeitsmappe"
      type="file"
      accept=".xlsx"
      class="form-control mb-2"
      :disabled="busy"
      @change="selectFile"
    />
    <button
      class="btn btn-outline-primary"
      :disabled="busy || !file"
      @click="upload"
    >
      LX-Datei importieren
    </button>
    <p class="mt-3">
      Eigene Excel-Spalten und Begriffe werden über die YAML-Spaltenzuordnung einer gespeicherten
      Kohorte importiert. Dort zuerst die Vorschau validieren.
    </p>
    <router-link to="/studies">Excel-Zuordnung und Kohorte öffnen</router-link>
    <p
      v-if="message"
      role="status"
      class="mt-3"
    >
      {{ message }}
    </p>
  </section>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  fetchStoredStudyOptions,
  fetchStudyLedgerWorkbook,
  acceptStudyHubTransfer,
  sendStudyLedgerToHub,
  importStudyLedgerWorkbook
} from '@/api/studyExportApi'
import type { StoredStudyOption } from '@/api/studyExportApi'
import { saveDownload } from '@/utils/saveDownload'
const studies = ref<StoredStudyOption[]>([])
const selected = ref('')
const transferId = ref('')
const sourceNodeKey = ref('')
const targetNodeKey = ref('')
const file = ref<File | null>(null)
const busy = ref(false)
const message = ref('')
onMounted(async () => {
  try {
    studies.value = await fetchStoredStudyOptions()
  } catch {
    message.value = 'Studien konnten nicht geladen werden.'
  }
})
function selectFile(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null
  message.value = ''
}
async function download() {
  busy.value = true
  message.value = ''
  try {
    const result = await fetchStudyLedgerWorkbook(selected.value)
    saveDownload(result.blob, result.filename)
    message.value = `${String(result.rowCount)} gespeicherte Datensammlungen exportiert.`
  } catch {
    message.value = 'Export fehlgeschlagen. Zugriff und gespeicherte Daten prüfen.'
  } finally {
    busy.value = false
  }
}
async function upload() {
  if (!file.value) return
  busy.value = true
  message.value = ''
  try {
    const count = await importStudyLedgerWorkbook(file.value)
    message.value = `${String(count)} Datensammlungen übernommen oder bereits vorhanden.`
    studies.value = await fetchStoredStudyOptions()
  } catch {
    message.value =
      'Import fehlgeschlagen. LX-Datei, Datenmodelle und vorhandene Untersuchungen prüfen.'
  } finally {
    busy.value = false
  }
}
async function sendToHub() {
  busy.value = true
  message.value = ''
  try {
    const receiptId = await sendStudyLedgerToHub(
      selected.value,
      sourceNodeKey.value.trim(),
      targetNodeKey.value.trim()
    )
    message.value =
      `Studienledger übertragen. Transfer-UUID am Ziel: ${receiptId}. Die Übernahme am Ziel muss dort bestätigt werden.`
  } catch {
    message.value =
      'Hub-Übertragung fehlgeschlagen. Knoten, Zugriff und Transportkonfiguration prüfen.'
  } finally {
    busy.value = false
  }
}
async function acceptTransfer() {
  busy.value = true
  message.value = ''
  try {
    await acceptStudyHubTransfer(transferId.value.trim())
    message.value = 'Empfangener Studienledger wurde übernommen.'
    studies.value = await fetchStoredStudyOptions()
  } catch {
    message.value =
      'Übernahme fehlgeschlagen. Transfer, Zugriff und vorhandene Untersuchungen prüfen.'
  } finally {
    busy.value = false
  }
}
</script>
