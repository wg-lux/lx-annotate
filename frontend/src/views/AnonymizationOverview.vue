<template>
  <div class="container-fluid py-4">
    <!-- Header -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="card shadow-sm">
          <div class="card-header bg-primary text-white">
            <div class="d-flex justify-content-between align-items-center">
              <h4 class="mb-0">
                <i class="fas fa-file-alt me-2"></i>
                Datei-Übersicht
              </h4>
              <button 
                class="btn btn-outline-light btn-sm"
                @click="refreshOverview"
                :disabled="store.loading"
              >
                <i class="fas fa-sync-alt me-1" :class="{ 'fa-spin': store.loading }"></i>
                Aktualisieren
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Status Cards -->
    <div class="row mb-4">
      <div class="col-md-3">
        <div class="card text-center">
          <div class="card-body">
            <h5 class="card-title text-muted">Gesamt</h5>
            <h2 class="text-primary">{{ store.overview.length }}</h2>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card text-center">
          <div class="card-body">
            <h5 class="card-title text-muted">Nicht gestartet</h5>
            <h2 class="text-secondary">{{ notStartedCount }}</h2>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card text-center">
          <div class="card-body">
            <h5 class="card-title text-muted">In Bearbeitung</h5>
            <h2 class="text-info">{{ processingCount }}</h2>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card text-center">
          <div class="card-body">
            <h5 class="card-title text-muted">Abgeschlossen</h5>
            <h2 class="text-success">{{ completedCount }}</h2>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="store.error" class="row mb-4">
      <div class="col-12">
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
          <i class="fas fa-exclamation-triangle me-2"></i>
          {{ store.error }}
          <button 
            type="button" 
            class="btn-close" 
            @click="store.error = null"
          ></button>
        </div>
      </div>
    </div>

    <!-- Files Table -->
    <div class="row">
      <div class="col-12">
        <div class="card shadow-sm">
          <div class="card-header">
            <h5 class="mb-0">Dateien</h5>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="bg-light">
                  <tr>
                    <th scope="col" class="px-4 py-3">
                      <i class="fas fa-file me-2"></i>Datei
                    </th>
                    <th scope="col" class="px-4 py-3">
                      <i class="fas fa-tags me-2"></i>Typ
                    </th>
                    <th scope="col" class="px-4 py-3">
                      <i class="fas fa-user-secret me-2"></i>Anonymisierung
                    </th>
                    <th scope="col" class="px-4 py-3">
                      <i class="fas fa-check-circle me-2"></i>Annotation
                    </th>
                    <th scope="col" class="px-4 py-3">
                      <i class="fas fa-calendar me-2"></i>Erstellt
                    </th>
                    <th scope="col" class="px-4 py-3 text-center">
                      <i class="fas fa-cogs me-2"></i>Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="store.overview.length === 0 && !store.loading">
                    <td colspan="6" class="text-center py-5 text-muted">
                      <i class="fas fa-inbox fa-3x mb-3 d-block"></i>
                      Keine Dateien gefunden
                    </td>
                  </tr>
                  <tr v-if="store.loading">
                    <td colspan="6" class="text-center py-5">
                      <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Lädt...</span>
                      </div>
                    </td>
                  </tr>
                  <tr v-for="file in store.overview" :key="file.id" class="border-bottom">
                    <td class="px-4 py-3">
                      <div class="d-flex align-items-center">
                        <i 
                          :class="getFileIcon(file.mediaType)" 
                          class="me-3 text-muted"
                        ></i>
                        <div>
                          <div class="fw-bold">{{ file.filename }}</div>
                          <small class="text-muted">ID: {{ file.id }}</small>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <span 
                        :class="getMediaTypeClass(file.mediaType)"
                        class="badge"
                      >
                        {{ file.mediaType.toUpperCase() }}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      <span :class="getStatusClass(file.anonymizationStatus)">
                        <i 
                          :class="getStatusIcon(file.anonymizationStatus)" 
                          class="me-1"
                        ></i>
                        {{ getStatusText(file.anonymizationStatus) }}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      <span :class="getStatusClass(file.annotationStatus)">
                        <i 
                          :class="getStatusIcon(file.annotationStatus)" 
                          class="me-1"
                        ></i>
                        {{ getStatusText(file.annotationStatus) }}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      <small class="text-muted">
                        {{ formatDate(file.createdAt) }}
                      </small>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <!-- Start Anonymization Button -->
                      <button 
                        v-if="file.anonymizationStatus === 'not_started'"
                        class="btn btn-sm btn-primary me-2"
                        @click="startAnonymization(file)"
                        :disabled="store.isAnyFileProcessing"
                        data-bs-toggle="tooltip"
                        title="Anonymisierung starten"
                      >
                        <i class="fas fa-play me-1"></i>
                        Starten
                      </button>
                      
                      <!-- Processing Indicator -->
                      <span 
                        v-else-if="file.anonymizationStatus === 'processing'"
                        class="text-info me-2"
                        data-bs-toggle="tooltip"
                        title="Anonymisierung läuft..."
                      >
                        <i class="fas fa-spinner fa-spin me-1"></i>
                        Läuft...
                      </span>
                      
                      <!-- Validate Button -->
                      <button 
                        v-else-if="file.anonymizationStatus === 'done' && file.annotationStatus === 'not_started'"
                        class="btn btn-sm btn-success me-2"
                        @click="validateFile(file)"
                        data-bs-toggle="tooltip"
                        title="Validierung starten"
                      >
                        <i class="fas fa-check me-1"></i>
                        Validieren
                      </button>
                      
                      <!-- Failed Status -->
                      <span 
                        v-else-if="file.anonymizationStatus === 'failed'"
                        class="text-danger me-2"
                        data-bs-toggle="tooltip"
                        title="Anonymisierung fehlgeschlagen"
                      >
                        <i class="fas fa-times-circle me-1"></i>
                        Fehler
                      </span>
                      
                      <!-- Completed -->
                      <span 
                        v-else
                        class="text-success"
                        data-bs-toggle="tooltip"
                        title="Vollständig abgeschlossen"
                      >
                        <i class="fas fa-check-circle me-1"></i>
                        Fertig
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Processing Info -->
    <div v-if="store.isAnyFileProcessing" class="row mt-4">
      <div class="col-12">
        <div class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>
          <strong>{{ store.processingFiles.length }} Datei(en)</strong> werden gerade anonymisiert.
          Der Upload neuer Dateien ist temporär deaktiviert.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAnonymizationStore, type FileItem } from '@/stores/anonymizationStore';

const store = useAnonymizationStore();
const router = useRouter();

// Computed properties for statistics
const notStartedCount = computed(() => 
  store.overview.filter(f => f.anonymizationStatus === 'not_started').length
);

const processingCount = computed(() => 
  store.overview.filter(f => f.anonymizationStatus === 'processing').length
);

const completedCount = computed(() => 
  store.overview.filter(f => 
    f.anonymizationStatus === 'done' && f.annotationStatus === 'done'
  ).length
);

// Lifecycle
onMounted(async () => {
  await store.fetchOverview();
});

onUnmounted(() => {
  // Clean up any polling when component is destroyed
  store.stopAllPolling();
});

// Actions
async function refreshOverview() {
  await store.refreshOverview();
}

async function startAnonymization(file: FileItem) {
  const success = await store.startAnonymization(file.id);
  if (success) {
    // Could show a toast notification here
    console.log(`Anonymization started for ${file.filename}`);
  }
}

async function validateFile(file: FileItem) {
  const data = await store.setCurrentForValidation(file.id);
  if (data) {
    // Navigate to validation view
    router.push('/anonymization/validate');
  }
}

// Helper functions
function getFileIcon(mediaType: string): string {
  return {
    pdf: 'fas fa-file-pdf fa-lg text-danger',
    video: 'fas fa-video fa-lg text-primary'
  }[mediaType] || 'fas fa-file fa-lg text-muted';
}

function getMediaTypeClass(mediaType: string): string {
  return {
    pdf: 'bg-danger',
    video: 'bg-primary'
  }[mediaType] || 'bg-secondary';
}

function getStatusClass(status: string): string {
  const baseClass = 'badge';
  const statusClasses = {
    'not_started': 'bg-secondary',
    'processing': 'bg-info',
    'done': 'bg-success',
    'failed': 'bg-danger'
  };
  return `${baseClass} ${statusClasses[status as keyof typeof statusClasses] || 'bg-secondary'}`;
}

function getStatusIcon(status: string): string {
  return {
    'not_started': 'fas fa-clock',
    'processing': 'fas fa-spinner fa-spin',
    'done': 'fas fa-check',
    'failed': 'fas fa-times'
  }[status] || 'fas fa-question';
}

function getStatusText(status: string): string {
  return {
    'not_started': 'Nicht gestartet',
    'processing': 'In Bearbeitung',
    'done': 'Abgeschlossen',
    'failed': 'Fehlgeschlagen'
  }[status] || status;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
</script>

<style scoped>
.table th {
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table td {
  vertical-align: middle;
}

.badge {
  font-size: 0.75rem;
  padding: 0.5em 0.75em;
}

.card {
  border: none;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
}

.btn-sm {
  font-size: 0.8rem;
  padding: 0.375rem 0.75rem;
}

.alert {
  border: none;
  border-radius: 0.5rem;
}

.spinner-border {
  width: 2rem;
  height: 2rem;
}
</style>