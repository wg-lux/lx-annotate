<template>
  <div class="d-flex flex-column gap-3">
    <div class="card shadow-sm">
      <div class="card-header d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0">Berichts-Arbeitsliste</h5>
          <small class="text-muted">Neue Berichte starten oder bestehende Fälle fortsetzen.</small>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary btn-sm" :disabled="loading" @click="loadReports">
            Aktualisieren
          </button>
          <RouterLink class="btn btn-primary btn-sm" to="/reporting/case-setup">
            Neuen Bericht starten
          </RouterLink>
        </div>
      </div>
      <div class="card-body">
        <div v-if="errorMessage" class="alert alert-danger py-2">
          {{ errorMessage }}
        </div>
        <div class="row g-3 align-items-end mb-3">
          <div class="col-md-4">
            <label class="form-label">Status</label>
            <select v-model="statusFilter" class="form-select">
              <option value="all">Alle</option>
              <option value="draft">Entwurf</option>
              <option value="final">Final</option>
            </select>
          </div>
          <div class="col-md-8 text-md-end small text-muted">
            {{ filteredItems.length }} von {{ items.length }} Berichten
          </div>
        </div>

        <div v-if="loading" class="text-muted">Lade Berichte...</div>
        <div v-else-if="!filteredItems.length" class="alert alert-info mb-0">
          Keine Berichte für den gewählten Filter gefunden.
        </div>
        <div v-else class="table-responsive">
          <table class="table table-sm align-middle">
            <thead>
              <tr>
                <th>Report-ID</th>
                <th>PatientExamination</th>
                <th>Status</th>
                <th>Version</th>
                <th>Aktualisiert</th>
                <th class="text-end">Aktion</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in filteredItems" :key="row.id">
                <td>#{{ row.id }}</td>
                <td>{{ patientExaminationId(row) ?? 'n/a' }}</td>
                <td>
                  <span class="badge" :class="statusBadgeClass(row.status)">
                    {{ row.status || 'unknown' }}
                  </span>
                </td>
                <td>{{ row.version ?? 'n/a' }}</td>
                <td>{{ formatTimestamp(row.updatedAt || row.createdAt) }}</td>
                <td class="text-end">
                  <RouterLink
                    v-if="patientExaminationId(row)"
                    class="btn btn-outline-dark btn-sm"
                    :to="`/reporting/${patientExaminationId(row)}/report-editor`"
                  >
                    Öffnen
                  </RouterLink>
                  <span v-else class="text-muted small">Kein Routing-Ziel</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'

type ReportListRow = {
  id: number
  status?: string | null
  version?: number | null
  updatedAt?: string | null
  createdAt?: string | null
  patientExaminationId?: number | null
  patientExamination?: number | { id?: number } | null
  patientExaminationFk?: number | null
}

const items = ref<ReportListRow[]>([])
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const statusFilter = ref<'all' | 'draft' | 'final'>('all')

const filteredItems = computed(() =>
  statusFilter.value === 'all'
    ? items.value
    : items.value.filter((row) => (row.status || '').toLowerCase() === statusFilter.value)
)

function patientExaminationId(row: ReportListRow): number | null {
  if (typeof row.patientExaminationId === 'number') return row.patientExaminationId
  if (typeof row.patientExaminationFk === 'number') return row.patientExaminationFk
  if (typeof row.patientExamination === 'number') return row.patientExamination
  if (row.patientExamination && typeof row.patientExamination === 'object') {
    const nestedId = (row.patientExamination as { id?: number }).id
    if (typeof nestedId === 'number') return nestedId
  }
  return null
}

function statusBadgeClass(status?: string | null): string {
  if ((status || '').toLowerCase() === 'final') return 'bg-success'
  if ((status || '').toLowerCase() === 'draft') return 'bg-warning text-dark'
  return 'bg-secondary'
}

function formatTimestamp(value?: string | null): string {
  if (!value) return 'n/a'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return value
  return dt.toLocaleString()
}

async function loadReports() {
  loading.value = true
  errorMessage.value = null
  try {
    const res = await axiosInstance.get(r(endpoints.report.patientExaminationReports))
    const rows = (Array.isArray(res.data?.results) ? res.data.results : res.data) as ReportListRow[]
    items.value = Array.isArray(rows) ? rows : []
  } catch (e: any) {
    errorMessage.value = e?.response?.data?.detail || e?.message || 'Fehler beim Laden der Arbeitsliste.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadReports()
})
</script>
