<template>
  <main class="container-fluid py-4 px-3 px-lg-4 monitoring-page">
    <header class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
      <div>
        <p class="text-muted mb-1">Administration / Runtime</p>
        <h1>Application monitoring</h1>
        <p class="text-muted mb-0">
          Current application and deployment health. Refresh to take a new snapshot.
        </p>
      </div>
      <button
        class="btn btn-primary"
        :disabled="monitoring.loading"
        @click="monitoring.refresh()"
      >
        {{ refreshLabel }}
      </button>
    </header>
    <p
      v-if="monitoring.loading"
      role="status"
    >
      Checking runtime health…
    </p>
    <div
      v-if="monitoring.error"
      class="alert alert-danger"
      role="alert"
    >
      {{ monitoring.error }}
    </div>
    <template v-if="monitoring.snapshot">
      <section
        class="card mb-4"
        aria-label="Overall health"
      >
        <div class="card-body d-flex flex-wrap gap-4 align-items-center">
          <strong
            class="badge fs-6"
            :class="statusClass[monitoring.snapshot.status]"
            data-test="overall-status"
          >
            {{ statusLabel[monitoring.snapshot.status] }}
          </strong>
          <div>
            <span class="text-muted">Application version</span><br /><strong>{{
              monitoring.snapshot.version ?? 'Unknown'
            }}</strong>
          </div>
          <div>
            <span class="text-muted">Snapshot observed</span><br /><time
              :datetime="monitoring.snapshot.observedAt"
              >{{ formatDate(monitoring.snapshot.observedAt) }}</time
            >
          </div>
        </div>
      </section>
      <section
        v-for="group in groups"
        :key="group.name"
        class="card mb-3"
        :aria-label="group.name"
      >
        <div class="card-header">
          <h2 class="h5 mb-0">{{ group.name }}</h2>
        </div>
        <ul class="list-group list-group-flush">
          <li
            v-for="check in group.checks"
            :key="check.key"
            class="list-group-item py-3"
          >
            <div class="d-flex gap-3 align-items-start">
              <span
                class="badge"
                :class="statusClass[check.status]"
                >{{ statusLabel[check.status] }}</span
              >
              <div class="flex-grow-1">
                <strong class="d-block">{{ checkLabel(check.key) }}</strong>
                <p class="mb-1">{{ check.summary }}</p>
                <p
                  v-if="check.detail"
                  class="text-muted mb-1"
                >
                  {{ check.detail }}
                </p>
                <details
                  v-if="Object.keys(check.metadata).length"
                  class="mt-2"
                >
                  <summary>Diagnostic details</summary>
                  <dl class="diagnostic-details mt-2 mb-0">
                    <template
                      v-for="(value, key) in check.metadata"
                      :key="key"
                    >
                      <dt>{{ humanize(key) }}</dt>
                      <dd class="diagnostic-details__value">{{ formatValue(value) }}</dd>
                    </template>
                  </dl>
                </details>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </template>
    <p
      v-else-if="!monitoring.loading && !monitoring.error"
      role="status"
    >
      Health is unknown until a snapshot is available.
    </p>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useMonitoringStore } from '@/stores/monitoring'
import type { MonitoringCheck, MonitoringStatus, MonitoringValue } from '@/api/monitoringApi'

const monitoring = useMonitoringStore()
const statusLabel: Record<MonitoringStatus, string> = {
  ok: 'Healthy',
  warning: 'Warning',
  error: 'Error',
  unknown: 'Unknown'
}
const statusClass: Record<MonitoringStatus, string> = {
  ok: 'bg-success',
  warning: 'bg-warning text-dark',
  error: 'bg-danger',
  unknown: 'bg-secondary'
}
const categories: Record<string, string> = {
  application: 'Application',
  database: 'Database and migrations',
  resources: 'Knowledge base and terminology',
  storage: 'Storage and disk',
  processing: 'Media ingestion and processing',
  services: 'System services',
  monitoring: 'Monitoring configuration'
}
const refreshLabel = computed(() => (monitoring.loading ? 'Refreshing…' : 'Refresh'))

const groups = computed(() => {
  const result = new Map<string, MonitoringCheck[]>()
  for (const check of monitoring.snapshot?.checks ?? []) {
    const name = categories[check.key.split('.')[0]] ?? 'Other checks'
    const entries = result.get(name) ?? []
    entries.push(check)
    result.set(name, entries)
  }
  return Array.from(result, ([name, checks]) => ({ name, checks }))
})
function humanize(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_.-]/g, ' ')
}
function checkLabel(key: string): string {
  return humanize(key.split('.').slice(1).join('.'))
}
function formatDate(value: string): string {
  return new Date(value).toLocaleString()
}
function formatValue(value: MonitoringValue): string {
  if (value === null) {
    return 'Unknown'
  }
  if (Array.isArray(value)) {
    return value.map(formatValue).join('; ') || 'None'
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, item]) => `${humanize(key)}: ${formatValue(item)}`)
      .join(', ')
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  return String(value)
}
onMounted(() => {
  if (!monitoring.snapshot && !monitoring.error && !monitoring.loading) {
    void monitoring.refresh()
  }
})
onBeforeUnmount(() => {
  monitoring.clear()
})
</script>

<style scoped>
.monitoring-page {
  max-width: 1200px;
}
.diagnostic-details {
  display: grid;
  grid-template-columns: minmax(9rem, 1fr) 3fr;
  gap: 0.3rem 1rem;
  overflow-wrap: anywhere;
  font-size: 0.9rem;
}
.diagnostic-details .diagnostic-details__value {
  margin: 0;
}
</style>
