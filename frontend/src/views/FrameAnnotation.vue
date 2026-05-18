<template>
  <div class="container-fluid py-4">
    <div class="row mb-3">
      <div class="col-12">
        <h4 class="mb-2">Frame-Annotation</h4>
        <p class="text-sm text-muted mb-3">
          Einfache Frame-basierte Annotation für zufällige oder gefilterte Aufgaben.
        </p>
        <div
          v-if="isPhiRegionMode"
          class="alert alert-warning d-flex align-items-center justify-content-between flex-wrap gap-2 py-2"
          role="alert"
          data-test="phi-region-mode-alert"
        >
          <span>
            <strong>Patienteninformationen-Region-Modus:</strong>
            {{ PHI_REGION_LABEL_NAME }} / {{ ANONYMIZER_INFORMATION_SOURCE }}
          </span>
          <RouterLink
            v-if="phiRegionReturnRoute"
            class="btn btn-outline-secondary btn-sm mb-0"
            :to="phiRegionReturnRoute"
          >
            Zur Validierung
          </RouterLink>
        </div>
        <p
          v-if="queueStore.aiDatasetName && queueStore.aiDatasetType"
          class="text-sm text-primary mb-0"
        >
          Aktive KI-Datensatz-Warteschlange: {{ queueStore.aiDatasetName }} ({{
            queueStore.aiDatasetType
          }})
          <template v-if="queueStore.aiDatasetId"> · ID {{ queueStore.aiDatasetId }}</template>
        </p>
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <label for="ai-dataset-id" class="form-label">Datensatz</label>
        <select
          id="ai-dataset-id"
          v-model="selectedAiDatasetId"
          class="form-select"
          data-test="frame-ai-dataset-select"
          :disabled="isLoadingAiDatasets || isSubmitting"
        >
          <option :value="NO_DATASET_OPTION">Kein Datensatzfilter</option>
          <option
            v-for="datasetOption in aiDatasetOptions"
            :key="datasetOption.id"
            :value="String(datasetOption.id)"
          >
            {{ datasetOption.label }} · {{ datasetOption.datasetType }} · ID {{ datasetOption.id }}
          </option>
        </select>
        <small v-if="isPatienteninformationenDatasetSelected" class="text-warning d-block mt-1">
          Patienteninformationen-Datensätze verwenden nur Frames aus Videos mit vorhandenem
          Rohmaterial. Bereits zugeschnittene oder nur noch anonymisiert vorliegende Videos werden
          ausgeschlossen.
        </small>
        <small v-else class="text-muted d-block mt-1">
          Steuert, aus welchem KI-Datensatz die Frame-Warteschlange gezogen wird.
        </small>
        <small v-if="aiDatasetLoadError" class="text-danger d-block mt-1">
          {{ aiDatasetLoadError }}
        </small>
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <label for="label-group-id" class="form-label">Label-Gruppe</label>
        <select
          v-if="labelGroupOptions.length > 0"
          id="label-group-id"
          v-model="selectedLabelGroupId"
          class="form-select"
        >
          <option value="">Label-Gruppe auswählen</option>
          <option v-for="group in labelGroupOptions" :key="group.id" :value="group.id">
            {{ group.displayName }} (ID: {{ group.id }})
          </option>
        </select>
        <input
          v-else
          id="label-group-id"
          v-model="selectedLabelGroupId"
          type="text"
          class="form-control"
          placeholder="e.g. 1"
        />
        <div class="d-flex align-items-center gap-2 mt-2">
          <button
            class="btn btn-outline-secondary btn-sm mb-0"
            :disabled="isLoadingLabelGroups"
            @click="loadLabelGroups"
          >
            {{ isLoadingLabelGroups ? 'Gruppen werden geladen...' : 'Gruppen neu laden' }}
          </button>
          <small v-if="labelGroupOptions.length > 0" class="text-muted">
            {{ labelGroupOptions.length }} Gruppe(n) verfügbar
          </small>
          <small v-else class="text-muted">
            Keine Gruppen gefunden. Sie können eine Gruppen-ID manuell eingeben.
          </small>
        </div>
        <small v-if="labelGroupLoadError" class="text-danger d-block mt-1">
          {{ labelGroupLoadError }}
        </small>
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <label for="task-mode" class="form-label">Aufgabenquelle</label>
        <select id="task-mode" v-model="taskMode" class="form-select">
          <option value="random">Zufällige Frames</option>
          <option value="filtered">Nach vorherigem Label gefiltert</option>
        </select>
        <small v-if="taskMode === 'random'" class="text-muted d-block mt-1">
          Zufallsmodus ist aktiv.
        </small>
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <label for="target-label-name" class="form-label">Zu annotierendes Label</label>
        <input
          id="target-label-name"
          v-model.lazy="targetLabelName"
          type="text"
          class="form-control"
          placeholder="Optional, z. B. polyp"
        />
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <label for="information-source" class="form-label">Informationsquelle</label>
        <input
          id="information-source"
          v-model.lazy="informationSource"
          type="text"
          class="form-control"
          placeholder="manual_annotation"
          list="information-source-options"
        />
        <datalist id="information-source-options">
          <option value="manual_annotation" />
          <option value="human_annotation" />
          <option value="frame_annotation_frontend" />
          <option value="lx_anonymizer_evaluation" />
          <option value="model_prediction" />
        </datalist>
      </div>
      <div class="col-12 col-lg-8">
        <label for="frame-annotator-override" class="form-label">Annotator-Scope</label>
        <div class="d-flex flex-wrap gap-2">
          <input
            id="frame-annotator-override"
            v-model.trim="annotatorOverrideInput"
            type="text"
            class="form-control annotator-override-input"
            data-test="annotator-override-input"
            :placeholder="baseAnnotatorPrincipal"
          />
          <button
            type="button"
            class="btn btn-outline-primary mb-0"
            :disabled="isSubmitting || !canApplyAnnotatorOverride"
            data-test="annotator-override-apply"
            @click="restartAnnotationAsOverride"
          >
            Annotation als anderer Nutzer neu starten
          </button>
          <button
            v-if="isAnnotatorOverrideActive"
            type="button"
            class="btn btn-outline-secondary mb-0"
            :disabled="isSubmitting"
            data-test="annotator-override-revert"
            @click="revertAnnotatorOverride"
          >
            Zurück zu meinem Nutzer
          </button>
        </div>
        <small class="text-muted d-block mt-1">Aktiver Annotator: {{ activeAnnotatorLabel }}</small>
      </div>
      <div v-if="taskMode === 'filtered'" class="col-12 col-md-6 col-lg-4">
        <label for="filter-label-name" class="form-label">Nach vorherigem Label filtern</label>
        <input
          id="filter-label-name"
          v-model.lazy="filterLabelName"
          type="text"
          class="form-control"
          placeholder="z. B. Blut"
        />
      </div>
      <div v-if="taskMode === 'filtered'" class="col-12 col-md-6 col-lg-4 d-flex align-items-end">
        <div class="form-check mb-2">
          <input
            id="random-fallback"
            v-model="allowRandomFallback"
            class="form-check-input"
            type="checkbox"
          />
          <label class="form-check-label" for="random-fallback">
            Auf zufällige Frames zurückfallen, wenn der Filter keine Treffer liefert
          </label>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-12 col-xl-8">
        <div class="card frame-card">
          <div class="card-body">
            <div v-if="isLoadingTask" class="text-muted">Aufgabe wird geladen...</div>
            <div v-else-if="!currentTask" class="text-muted">
              Keine Annotationsaufgaben verfügbar.
            </div>
            <template v-else>
              <div class="task-meta mb-2">
                <span class="badge bg-light text-dark me-2" data-test="frame-number-badge">
                  Frame {{ currentTask.data.frameNumber ?? 'n/a' }}
                </span>
                <span class="badge bg-light text-dark me-2" data-test="frame-id-badge">
                  Frame-ID {{ currentTask.data.frameId }}
                </span>
                <span
                  v-if="currentTask.data.videoId"
                  class="badge bg-light text-dark me-2"
                  data-test="video-id-badge"
                >
                  Video-ID {{ currentTask.data.videoId }}
                </span>
                <span
                  v-if="currentTask.data.datasetSelectionLabelName"
                  class="badge bg-info-subtle text-info-emphasis me-2"
                  data-test="dataset-selection-badge"
                >
                  {{ currentTask.data.datasetSelectionLabelName }}
                  <template v-if="currentTask.data.datasetSelectionSource">
                    · {{ currentTask.data.datasetSelectionSource }}
                  </template>
                </span>
                <span
                  v-if="currentTask.data.datasetBucket"
                  class="badge bg-secondary-subtle text-secondary-emphasis me-2"
                  data-test="dataset-bucket-badge"
                >
                  {{ currentTask.data.datasetBucket }}
                </span>
                <span class="badge bg-light text-dark">Aufgabe {{ currentTask.id }}</span>
              </div>
              <div
                ref="frameStageElement"
                class="frame-image-stage rounded border"
                data-test="frame-box-stage"
                @pointerdown="startBoxDraft"
                @pointermove="updateBoxDraft"
                @pointerup="finishBoxDraft"
                @pointercancel="cancelBoxDraft"
                @pointerleave="finishBoxDraft"
              >
                <img
                  ref="frameImageElement"
                  :src="frameImageRequestUrl"
                  class="img-fluid rounded frame-image"
                  alt="Zu annotierender Frame"
                  draggable="false"
                  @load="handleFrameImageLoad"
                  @error="handleFrameImageError"
                />
                <div
                  v-if="showFrameImageStatus"
                  class="frame-image-status"
                  data-test="frame-image-status"
                  @pointerdown.stop
                >
                  <span>{{ frameImageStatusMessage }}</span>
                  <button
                    v-if="canManuallyRetryFrameImage"
                    type="button"
                    class="btn btn-outline-primary btn-sm mb-0"
                    data-test="frame-image-retry-button"
                    @click.stop="retryFrameImage"
                  >
                    Erneut versuchen
                  </button>
                </div>
                <div class="box-annotation-layer" aria-hidden="true">
                  <div
                    v-for="box in boxAnnotations"
                    :key="box.clientId"
                    class="box-annotation-rect"
                    :class="{ 'box-annotation-rect-active': activeBoxClientId === box.clientId }"
                    :style="boxAnnotationStyle(box)"
                    @pointerdown.stop="activeBoxClientId = box.clientId"
                  >
                    <span>{{ box.labelName }}</span>
                  </div>
                  <div
                    v-if="draftBox"
                    class="box-annotation-rect box-annotation-rect-draft"
                    :style="boxAnnotationStyle(draftBox)"
                  />
                </div>
              </div>
              <div class="mt-3">
                <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                  <h6 class="mb-0">Multilabel-Status</h6>
                  <button
                    class="btn btn-outline-primary btn-sm mb-0"
                    :disabled="isSubmitting"
                    @click="applySuggestedLabels"
                  >
                    KI-Vorschlag übernehmen
                  </button>
                </div>
                <div v-if="annotationLabelOptions.length === 0" class="text-muted">
                  Keine Labels für diese Frame-Aufgabe verfügbar.
                </div>
                <div v-else class="label-grid">
                  <label
                    v-for="label in annotationLabelOptions"
                    :key="label.id"
                    class="label-option border rounded p-2"
                  >
                    <div class="form-check mb-1">
                      <input
                        :id="`frame-label-${label.id}`"
                        v-model="selectedLabelIds"
                        class="form-check-input"
                        type="checkbox"
                        :value="label.id"
                      />
                      <span class="form-check-label">{{ label.name }}</span>
                    </div>
                    <div class="d-flex gap-1 flex-wrap">
                      <span
                        v-if="manualAnnotationState[label.id]?.value"
                        class="badge bg-success-subtle text-success-emphasis"
                      >
                        Manuell
                      </span>
                      <span
                        v-else-if="manualAnnotationState[label.id]"
                        class="badge bg-secondary-subtle text-secondary-emphasis"
                      >
                        Manuell nein
                      </span>
                      <span
                        v-if="predictionAnnotationState[label.id]?.value"
                        class="badge bg-info-subtle text-info-emphasis"
                      >
                        KI
                        <template v-if="predictionAnnotationState[label.id]?.floatValue !== null">
                          {{ formatConfidence(predictionAnnotationState[label.id]?.floatValue) }}
                        </template>
                      </span>
                    </div>
                  </label>
                </div>
              </div>
              <div class="mt-3 box-annotation-panel border rounded p-3">
                <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                  <h6 class="mb-0">Box-basierte Annotation</h6>
                  <div class="d-flex gap-2 flex-wrap">
                    <button
                      type="button"
                      class="btn btn-outline-secondary btn-sm mb-0"
                      :disabled="informationSource === ANONYMIZER_INFORMATION_SOURCE"
                      data-test="anonymizer-source-button"
                      @click="useAnonymizerInformationSource"
                    >
                      Quelle setzen
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline-primary btn-sm mb-0"
                      :disabled="isSavingBoxAnnotations"
                      data-test="phi-region-mode-button"
                      @click="usePhiRegionAnnotationPreset"
                    >
                      Patienteninformationen-Region
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline-success btn-sm mb-0"
                      :disabled="isSavingBoxAnnotations || !currentTask"
                      data-test="box-save-button"
                      @click="submitBoxAnnotations"
                    >
                      Boxen speichern
                    </button>
                    <button
                      v-if="isPhiRegionMode"
                      type="button"
                      class="btn btn-outline-warning btn-sm mb-0"
                      :disabled="isSavingBoxAnnotations || !currentTask"
                      data-test="phi-empty-background-button"
                      @click="submitEmptyPhiBackgroundFrame"
                    >
                      Hintergrundframe speichern
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline-secondary btn-sm mb-0"
                      :disabled="isSavingBoxAnnotations || boxAnnotations.length === 0"
                      data-test="box-clear-button"
                      @click="clearBoxAnnotations"
                    >
                      Boxen löschen
                    </button>
                  </div>
                </div>
                <div class="row g-2 align-items-end mb-3">
                  <div class="col-12 col-md-6">
                    <label for="box-label-id" class="form-label">Box-Label</label>
                    <select
                      id="box-label-id"
                      v-model.number="selectedBoxLabelId"
                      class="form-select"
                      data-test="box-label-select"
                      :disabled="annotationLabelOptions.length === 0 || isPhiRegionMode"
                    >
                      <option :value="null">Label auswählen</option>
                      <option
                        v-for="label in annotationLabelOptions"
                        :key="label.id"
                        :value="label.id"
                      >
                        {{ label.name }}
                      </option>
                    </select>
                    <small
                      v-if="isPhiRegionMode && phiRegionBoxLabel"
                      class="text-muted d-block mt-1"
                    >
                      Boxen werden als {{ phiRegionBoxLabel.name }} gespeichert.
                    </small>
                    <small v-else-if="isPhiRegionBoxLabelMissing" class="text-danger d-block mt-1">
                      Label {{ PHI_REGION_LABEL_NAME }} fehlt in dieser Label-Gruppe.
                    </small>
                  </div>
                  <div class="col-12 col-md-6">
                    <div class="d-flex flex-wrap gap-2">
                      <span class="badge bg-light text-dark">
                        {{ boxAnnotations.length }} Box(en)
                      </span>
                      <span v-if="isLoadingBoxAnnotations" class="badge bg-light text-dark">
                        Boxen werden geladen
                      </span>
                    </div>
                  </div>
                </div>
                <div v-if="boxAnnotations.length > 0" class="box-annotation-list mb-3">
                  <div
                    v-for="box in boxAnnotations"
                    :key="`list-${box.clientId}`"
                    class="box-annotation-list-item"
                    :class="{
                      'box-annotation-list-item-active': activeBoxClientId === box.clientId
                    }"
                    @click="activeBoxClientId = box.clientId"
                  >
                    <div>
                      <strong>{{ box.labelName }}</strong>
                      <small class="text-muted d-block">{{ formatBoxAnnotation(box) }}</small>
                    </div>
                    <button
                      type="button"
                      class="btn btn-outline-danger btn-sm mb-0"
                      :disabled="isSavingBoxAnnotations"
                      @click.stop="removeBoxAnnotation(box.clientId)"
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
                <small v-if="boxAnnotationError" class="text-danger d-block mb-3">
                  {{ boxAnnotationError }}
                </small>
                <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                  <h6 class="mb-0">Anonymizer-Schnellfelder</h6>
                  <div class="d-flex gap-2 flex-wrap">
                    <button
                      type="button"
                      class="btn btn-outline-primary btn-sm mb-0"
                      :disabled="!hasAnonymizerSensitiveLabels"
                      data-test="anonymizer-sensitive-present-button"
                      @click="markSensitiveAnonymizerLabels(true)"
                    >
                      Patienteninformationen sichtbar
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline-primary btn-sm mb-0"
                      :disabled="!hasAnonymizerSensitiveLabels"
                      data-test="anonymizer-sensitive-absent-button"
                      @click="markSensitiveAnonymizerLabels(false)"
                    >
                      Patienteninformationen nicht sichtbar
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline-secondary btn-sm mb-0"
                      :disabled="!hasAnyAnonymizerLabels"
                      data-test="anonymizer-all-visible-button"
                      @click="markAllAnonymizerLabels(true)"
                    >
                      Alle sichtbar
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline-secondary btn-sm mb-0"
                      :disabled="!hasAnyAnonymizerLabels"
                      data-test="anonymizer-clear-button"
                      @click="clearAnonymizerLabels"
                    >
                      Alle löschen
                    </button>
                  </div>
                </div>
                <div class="anonymizer-field-grid">
                  <label
                    v-for="field in anonymizerFieldRows"
                    :key="field.key"
                    class="anonymizer-field-option border rounded p-2"
                    :class="{ 'anonymizer-field-option-missing': field.labelId === null }"
                  >
                    <div class="form-check mb-1">
                      <input
                        :id="`anonymizer-field-${field.key}`"
                        class="form-check-input"
                        type="checkbox"
                        :checked="field.selected"
                        :disabled="field.labelId === null"
                        @change="setAnonymizerFieldSelected(field.key, getCheckboxChecked($event))"
                      />
                      <span class="form-check-label">{{ field.label }}</span>
                    </div>
                    <small v-if="field.labelName" class="text-muted">
                      {{ field.labelName }}
                    </small>
                    <span v-else class="badge bg-warning-subtle text-warning-emphasis">
                      Label fehlt
                    </span>
                  </label>
                </div>
                <small
                  v-if="missingAnonymizerFieldLabels.length > 0"
                  class="text-muted d-block mt-2"
                >
                  Fehlende Labels: {{ missingAnonymizerFieldLabels.join(', ') }}
                </small>
              </div>
              <div class="mt-3 d-flex gap-2 flex-wrap">
                <button
                  class="btn btn-success sidebar-action-button"
                  :disabled="isSubmitting"
                  @click="submitLabels"
                >
                  Labels speichern
                </button>
                <button
                  class="btn btn-outline-success sidebar-action-button"
                  :disabled="isSubmitting"
                  data-test="positive-example-button"
                  @click="submitPositiveExample"
                >
                  Positives Beispiel
                </button>
                <button
                  class="btn btn-outline-danger sidebar-action-button"
                  :disabled="isSubmitting"
                  data-test="negative-example-button"
                  @click="submitNegativeExample"
                >
                  Negatives Beispiel
                </button>
                <button
                  class="btn btn-outline-secondary sidebar-action-button"
                  :disabled="isSubmitting"
                  @click="clearSelectedLabels"
                >
                  Auswahl leeren
                </button>
                <button
                  class="btn btn-outline-warning sidebar-action-button"
                  :disabled="isSubmitting"
                  data-test="exclude-dataset-button"
                  @click="skipTask"
                >
                  Nicht im Datensatz aufnehmen
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
      <div class="col-12">
        <div v-if="visibleErrorMessage" class="alert alert-danger mb-0" role="alert">
          {{ visibleErrorMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { v7 as uuidv7 } from 'uuid'
import axiosInstance, { r } from '@/api/axiosInstance'
import { fetchAiDatasetOptions, type AiDatasetOption } from '@/api/aiDatasetApi'
import { endpoints } from '@/types/api/endpoints'
import { useAnnotationQueueStore } from '@/stores/annotationQueue'
import { useAuthKcStore } from '@/stores/auth_kc'
import {
  clearAnnotatorOverride,
  getAnnotatorPrincipalFromAuthUser,
  loadAnnotatorOverride,
  saveAnnotatorOverride
} from '@/utils/annotationPrincipal'

interface LabelGroupOption {
  id: string
  name: string
  displayName: string
  version: number | null
  labelCount: number | null
}

interface AnonymizerFieldDefinition {
  key: string
  label: string
  aliases: string[]
  sensitive: boolean
}

interface AnonymizerFieldRow extends AnonymizerFieldDefinition {
  labelId: number | null
  labelName: string
  selected: boolean
}

interface FrameBoxAnnotationDraft {
  id: number | null
  clientId: string
  frameId: number
  labelId: number
  labelName: string
  value: boolean
  floatValue: number | null
  x: number
  y: number
  width: number
  height: number
  imageWidth: number
  imageHeight: number
  annotator: string
  externalAnnotationId: string
}

interface ImagePoint {
  x: number
  y: number
  imageWidth: number
  imageHeight: number
}

type FrameImageLoadState = 'idle' | 'probing' | 'loading' | 'pending' | 'loaded' | 'failed'

const ANONYMIZER_INFORMATION_SOURCE = 'lx_anonymizer_evaluation'
const PHI_REGION_MODE_QUERY_VALUE = 'phi_region'
const PHI_REGION_LABEL_NAME = 'sensitive_region'
const PHI_REGION_DATASET_MODEL_TYPE = 'phi_region_detector'
const NO_DATASET_OPTION = '__none__'
const FRAME_IMAGE_RETRY_LIMIT = 3
const FRAME_IMAGE_RETRY_DELAY_MS = 1200
const PHI_REGION_LABEL_ALIASES = [
  PHI_REGION_LABEL_NAME,
  'phi',
  'phi_region',
  'protected_health_information',
  'protected health information',
  'patient_data_region',
  'patient data region',
  'anonymization_region',
  'anonymization region',
  'sensitive_ui_region',
  'sensitive ui region',
  'patienten_daten',
  'patientendaten',
  'sensible_region'
]
const ANONYMIZER_FIELD_DEFINITIONS: AnonymizerFieldDefinition[] = [
  {
    key: 'endoscope_image',
    label: 'Endoskop-Bild',
    aliases: ['endoscope_image', 'endoscope image', 'endoscopy image', 'endo image'],
    sensitive: false
  },
  {
    key: 'examination_date',
    label: 'Untersuchungsdatum',
    aliases: ['examination_date', 'examination date', 'exam date', 'date'],
    sensitive: true
  },
  {
    key: 'examination_time',
    label: 'Untersuchungszeit',
    aliases: ['examination_time', 'examination time', 'exam time', 'time'],
    sensitive: true
  },
  {
    key: 'patient_first_name',
    label: 'Vorname',
    aliases: ['patient_first_name', 'patient first name', 'first name', 'vorname'],
    sensitive: true
  },
  {
    key: 'patient_last_name',
    label: 'Nachname',
    aliases: ['patient_last_name', 'patient last name', 'last name', 'nachname'],
    sensitive: true
  },
  {
    key: 'patient_dob',
    label: 'Geburtsdatum',
    aliases: ['patient_dob', 'patient dob', 'date of birth', 'birth date', 'geburtsdatum'],
    sensitive: true
  },
  {
    key: 'endoscope_type',
    label: 'Endoskop-Typ',
    aliases: ['endoscope_type', 'endoscope type', 'scope type'],
    sensitive: false
  },
  {
    key: 'endoscope_sn',
    label: 'Endoskop-Seriennummer',
    aliases: ['endoscope_sn', 'endoscope serial number', 'scope serial number', 'serial number'],
    sensitive: false
  }
]

const queueStore = useAnnotationQueueStore()
const authStore = useAuthKcStore()
const isLoadingTask = ref(false)
const isSubmitting = ref(false)
const currentTask = ref<ReturnType<typeof queueStore.popNextTask> | null>(null)
const selectedLabelIds = ref<number[]>([])
const errorMessage = ref<string | null>(null)
const isLoadingLabelGroups = ref(false)
const labelGroupLoadError = ref<string | null>(null)
const labelGroupOptions = ref<LabelGroupOption[]>([])
const aiDatasetOptions = ref<AiDatasetOption[]>([])
const isLoadingAiDatasets = ref(false)
const aiDatasetLoadError = ref<string | null>(null)
const annotatorOverride = ref<string | null>(null)
const annotatorOverrideInput = ref('')
const frameImageElement = ref<HTMLImageElement | null>(null)
const frameStageElement = ref<HTMLElement | null>(null)
const frameImageRequestUrl = ref('')
const frameImageLoadState = ref<FrameImageLoadState>('idle')
const frameImageRetryCount = ref(0)
const selectedBoxLabelId = ref<number | null>(null)
const boxAnnotations = ref<FrameBoxAnnotationDraft[]>([])
const draftBox = ref<FrameBoxAnnotationDraft | null>(null)
const activeBoxClientId = ref<string | null>(null)
const isLoadingBoxAnnotations = ref(false)
const isSavingBoxAnnotations = ref(false)
const boxAnnotationError = ref<string | null>(null)
const initialRouteQuery = new URLSearchParams(window.location.search)
let boxDraftStart: ImagePoint | null = null
let frameImageRetryTimer: ReturnType<typeof setTimeout> | null = null
let frameImageProbeGeneration = 0
let isReloadingAnnotationQueue = false
let isBootstrappingAnnotationQueue = true

const selectedLabelGroupId = computed({
  get: () => queueStore.selectedLabelGroupId ?? '',
  set: (value: string) => queueStore.setSelectedLabelGroupId(value.trim() || null)
})

const taskMode = computed({
  get: () => queueStore.taskMode,
  set: (value: string) => queueStore.setTaskMode(value === 'filtered' ? 'filtered' : 'random')
})

const targetLabelName = computed({
  get: () => queueStore.targetLabelName,
  set: (value: string) => queueStore.setTargetLabelName(value)
})

const filterLabelName = computed({
  get: () => queueStore.filterLabelName ?? '',
  set: (value: string) => queueStore.setFilterLabelName(value.trim() || null)
})

const allowRandomFallback = computed({
  get: () => queueStore.allowRandomFallback,
  set: (value: boolean) => queueStore.setAllowRandomFallback(value)
})

const selectedAiDatasetId = computed({
  get: () => {
    if (queueStore.aiDatasetId) {
      const selectedById = aiDatasetOptions.value.find(
        (dataset) => String(dataset.id) === queueStore.aiDatasetId
      )
      if (selectedById) return String(selectedById.id)
    }
    const match = aiDatasetOptions.value.find(
      (dataset) =>
        dataset.label === queueStore.aiDatasetName &&
        dataset.datasetType === queueStore.aiDatasetType
    )
    return match ? String(match.id) : NO_DATASET_OPTION
  },
  set: (value: string) => {
    if (value === NO_DATASET_OPTION) {
      queueStore.setAiDataset(null, null, null)
      return
    }
    const selected = aiDatasetOptions.value.find((dataset) => String(dataset.id) === value)
    queueStore.setAiDataset(
      selected?.label ?? null,
      selected?.datasetType ?? null,
      selected?.id ?? null
    )
  }
})

const informationSource = computed({
  get: () => queueStore.informationSource,
  set: (value: string) => queueStore.setInformationSource(value)
})

const annotationLabelOptions = computed(() => currentTask.value?.data.labelOptions ?? [])
const selectedBoxLabel = computed(
  () => annotationLabelOptions.value.find((label) => label.id === selectedBoxLabelId.value) ?? null
)
const routePhiRegionMode = computed(() => {
  const mode = normalizeAnonymizerLabelName(initialRouteQuery.get('mode') ?? '')
  const targetLabel = normalizeAnonymizerLabelName(initialRouteQuery.get('targetLabel') ?? '')
  return mode === PHI_REGION_MODE_QUERY_VALUE || targetLabel === PHI_REGION_LABEL_NAME
})
const isPhiRegionMode = computed(
  () =>
    routePhiRegionMode.value ||
    normalizeAnonymizerLabelName(targetLabelName.value) === PHI_REGION_LABEL_NAME
)
const phiRegionReturnRoute = computed(() => initialRouteQuery.get('returnTo')?.trim() || '')
const phiRegionBoxLabel = computed(() => findLabelByAliases(PHI_REGION_LABEL_ALIASES))
const isPhiRegionBoxLabelMissing = computed(
  () =>
    isPhiRegionMode.value &&
    annotationLabelOptions.value.length > 0 &&
    phiRegionBoxLabel.value === null
)
const selectedAiDataset = computed(
  () =>
    aiDatasetOptions.value.find((dataset) => String(dataset.id) === queueStore.aiDatasetId) ??
    aiDatasetOptions.value.find(
      (dataset) =>
        dataset.label === queueStore.aiDatasetName &&
        dataset.datasetType === queueStore.aiDatasetType
    ) ??
    null
)
const isPhiDatasetSelected = computed(
  () => selectedAiDataset.value?.aiModelType === PHI_REGION_DATASET_MODEL_TYPE
)
const isPatienteninformationenDatasetSelected = computed(() => isPhiDatasetSelected.value)
const showFrameImageStatus = computed(
  () => !!currentTask.value && frameImageLoadState.value !== 'loaded'
)
const canManuallyRetryFrameImage = computed(
  () => !!currentTask.value && frameImageLoadState.value === 'failed'
)
const frameImageStatusMessage = computed(() => {
  if (frameImageLoadState.value === 'pending') {
    return `Frame wird extrahiert... automatischer Versuch ${frameImageRetryCount.value}/${FRAME_IMAGE_RETRY_LIMIT}`
  }
  if (frameImageLoadState.value === 'failed') {
    if (frameImageRetryCount.value >= FRAME_IMAGE_RETRY_LIMIT) {
      return 'Frame ist noch nicht verfügbar. Automatische Versuche sind beendet.'
    }
    return 'Frame konnte nicht geladen werden. Bitte Aufgabe neu laden oder spaeter erneut versuchen.'
  }
  return 'Frame wird bereitgestellt...'
})
const visibleErrorMessage = computed(() => errorMessage.value || queueStore.lastError)
const baseAnnotatorPrincipal = computed(() =>
  getAnnotatorPrincipalFromAuthUser(authStore.user as Record<string, unknown> | null)
)
const annotatorOverrideScope = computed(
  () => `frame:${queueStore.selectedLabelGroupId ?? 'all'}:${informationSource.value}`
)
const activeAnnotatorPrincipal = computed(
  () => annotatorOverride.value || baseAnnotatorPrincipal.value
)
const isAnnotatorOverrideActive = computed(() => annotatorOverride.value !== null)
const canApplyAnnotatorOverride = computed(() => {
  const normalized = annotatorOverrideInput.value.trim()
  return (
    !!normalized &&
    normalized !== activeAnnotatorPrincipal.value &&
    normalized !== baseAnnotatorPrincipal.value
  )
})
const activeAnnotatorLabel = computed(() =>
  isAnnotatorOverrideActive.value
    ? `${activeAnnotatorPrincipal.value} (Override)`
    : activeAnnotatorPrincipal.value
)

const manualAnnotationState = computed(() =>
  Object.fromEntries(
    (currentTask.value?.data.manualAnnotations ?? []).map((annotation) => [
      annotation.labelId,
      annotation
    ])
  )
)

const predictionAnnotationState = computed(() =>
  Object.fromEntries(
    (currentTask.value?.data.predictionAnnotations ?? []).map((annotation) => [
      annotation.labelId,
      annotation
    ])
  )
)

const labelOptionByNormalizedName = computed(() => {
  const byName = new Map<string, { id: number; name: string }>()
  for (const label of annotationLabelOptions.value) {
    byName.set(normalizeAnonymizerLabelName(label.name), label)
  }
  return byName
})

const anonymizerFieldRows = computed<AnonymizerFieldRow[]>(() =>
  ANONYMIZER_FIELD_DEFINITIONS.map((definition) => {
    const label = findAnonymizerLabelForDefinition(definition)
    return {
      ...definition,
      labelId: label?.id ?? null,
      labelName: label?.name ?? '',
      selected: label ? selectedLabelIds.value.includes(label.id) : false
    }
  })
)

const hasAnyAnonymizerLabels = computed(() =>
  anonymizerFieldRows.value.some((field) => field.labelId !== null)
)
const hasAnonymizerSensitiveLabels = computed(() =>
  anonymizerFieldRows.value.some((field) => field.sensitive && field.labelId !== null)
)
const missingAnonymizerFieldLabels = computed(() =>
  anonymizerFieldRows.value.filter((field) => field.labelId === null).map((field) => field.key)
)

function syncSelectedLabelsFromTask(task: typeof currentTask.value): void {
  if (!task) {
    selectedLabelIds.value = []
    return
  }
  const manualSelected = (task.data.manualAnnotations ?? [])
    .filter((annotation) => annotation.value)
    .map((annotation) => annotation.labelId)
  if (manualSelected.length > 0) {
    selectedLabelIds.value = [...new Set(manualSelected)]
    return
  }
  selectedLabelIds.value = [...new Set(task.data.suggestedLabelIds ?? [])]
}

function clearSelectedLabels(): void {
  selectedLabelIds.value = []
}

function applySuggestedLabels(): void {
  selectedLabelIds.value = [...new Set(currentTask.value?.data.suggestedLabelIds ?? [])]
}

function normalizeAnonymizerLabelName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

function findLabelByAliases(aliases: string[]): { id: number; name: string } | null {
  for (const alias of aliases) {
    const normalizedAlias = normalizeAnonymizerLabelName(alias)
    if (!normalizedAlias) continue
    const label = labelOptionByNormalizedName.value.get(normalizedAlias)
    if (label) return label
  }
  return null
}

function findAnonymizerLabelForDefinition(
  definition: AnonymizerFieldDefinition
): { id: number; name: string } | null {
  return findLabelByAliases(definition.aliases)
}

function getCheckboxChecked(event: Event): boolean {
  return (event.target as HTMLInputElement | null)?.checked ?? false
}

function setLabelSelection(labelId: number, selected: boolean): void {
  const nextSelection = new Set(selectedLabelIds.value)
  if (selected) {
    nextSelection.add(labelId)
  } else {
    nextSelection.delete(labelId)
  }
  selectedLabelIds.value = [...nextSelection]
}

function setAnonymizerFieldSelected(fieldKey: string, selected: boolean): void {
  const field = anonymizerFieldRows.value.find((row) => row.key === fieldKey)
  if (field?.labelId === null || field?.labelId === undefined) return
  setLabelSelection(field.labelId, selected)
}

function setAnonymizerFields(rows: AnonymizerFieldRow[], selected: boolean): void {
  const nextSelection = new Set(selectedLabelIds.value)
  for (const field of rows) {
    if (field.labelId === null) continue
    if (selected) {
      nextSelection.add(field.labelId)
    } else {
      nextSelection.delete(field.labelId)
    }
  }
  selectedLabelIds.value = [...nextSelection]
}

function markSensitiveAnonymizerLabels(selected: boolean): void {
  setAnonymizerFields(
    anonymizerFieldRows.value.filter((field) => field.sensitive),
    selected
  )
}

function markAllAnonymizerLabels(selected: boolean): void {
  setAnonymizerFields(anonymizerFieldRows.value, selected)
}

function clearAnonymizerLabels(): void {
  markAllAnonymizerLabels(false)
}

function useAnonymizerInformationSource(): void {
  informationSource.value = ANONYMIZER_INFORMATION_SOURCE
}

function usePhiRegionAnnotationPreset(): void {
  taskMode.value = 'random'
  targetLabelName.value = PHI_REGION_LABEL_NAME
  informationSource.value = ANONYMIZER_INFORMATION_SOURCE
  ensureSelectedBoxLabel()
}

function applyRoutePreset(): void {
  if (!routePhiRegionMode.value) return

  const queryTaskMode = initialRouteQuery.get('taskMode')
  const queryTargetLabel = initialRouteQuery.get('targetLabel')?.trim()
  const queryInformationSource = initialRouteQuery.get('informationSource')?.trim()
  const queryLabelGroupId = initialRouteQuery.get('labelGroupId')?.trim()

  taskMode.value = queryTaskMode === 'filtered' ? 'filtered' : 'random'
  targetLabelName.value = queryTargetLabel || PHI_REGION_LABEL_NAME
  informationSource.value = queryInformationSource || ANONYMIZER_INFORMATION_SOURCE

  if (queryLabelGroupId) {
    selectedLabelGroupId.value = queryLabelGroupId
  }
}

function ensureSelectedBoxLabel(): void {
  if (isPhiRegionMode.value) {
    selectedBoxLabelId.value = phiRegionBoxLabel.value?.id ?? null
    return
  }

  if (
    selectedBoxLabelId.value !== null &&
    annotationLabelOptions.value.some((label) => label.id === selectedBoxLabelId.value)
  ) {
    return
  }
  selectedBoxLabelId.value = annotationLabelOptions.value[0]?.id ?? null
}

function resetBoxAnnotationState(): void {
  boxAnnotations.value = []
  draftBox.value = null
  activeBoxClientId.value = null
  boxAnnotationError.value = null
  boxDraftStart = null
  ensureSelectedBoxLabel()
}

function clearFrameImageRetryTimer(): void {
  if (frameImageRetryTimer !== null) {
    clearTimeout(frameImageRetryTimer)
    frameImageRetryTimer = null
  }
}

function withCacheBuster(url: string): string {
  if (!url) return ''
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}cb=${Date.now()}`
}

function resetFrameImageState(task: typeof currentTask.value): void {
  clearFrameImageRetryTimer()
  frameImageProbeGeneration += 1
  frameImageRetryCount.value = 0
  if (!task) {
    frameImageRequestUrl.value = ''
    frameImageLoadState.value = 'idle'
    return
  }
  frameImageRequestUrl.value = ''
  frameImageLoadState.value = 'probing'
}

function syncFrameImageMetrics(): void {
  if (!frameImageElement.value) return
  cancelBoxDraft()
}

function handleFrameImageLoad(): void {
  clearFrameImageRetryTimer()
  frameImageLoadState.value = 'loaded'
  syncFrameImageMetrics()
}

function scheduleFrameImageRetry(task: NonNullable<typeof currentTask.value>): void {
  clearFrameImageRetryTimer()
  frameImageRetryTimer = setTimeout(() => {
    void probeFrameImage(task)
  }, FRAME_IMAGE_RETRY_DELAY_MS)
}

function handleFrameImageError(): void {
  if (!currentTask.value) {
    frameImageLoadState.value = 'failed'
    return
  }
  if (frameImageRetryCount.value >= FRAME_IMAGE_RETRY_LIMIT) {
    clearFrameImageRetryTimer()
    frameImageLoadState.value = 'failed'
    return
  }
  frameImageRetryCount.value += 1
  frameImageLoadState.value = 'pending'
  frameImageRequestUrl.value = ''
  scheduleFrameImageRetry(currentTask.value)
}

function retryFrameImage(): void {
  if (!currentTask.value) return
  clearFrameImageRetryTimer()
  frameImageRetryCount.value = 0
  frameImageRequestUrl.value = ''
  void probeFrameImage(currentTask.value)
}

function readBlobText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') {
    return blob.text()
  }
  return Promise.resolve('')
}

async function extractPendingMessage(blob: Blob): Promise<string | null> {
  try {
    const text = await readBlobText(blob)
    if (!text) return null
    const payload = JSON.parse(text) as Record<string, unknown>
    const status = typeof payload.status === 'string' ? payload.status : null
    if (status === 'frame_extraction_failed') {
      return 'Frame konnte nicht extrahiert werden. Bitte spaeter erneut versuchen.'
    }
    return null
  } catch {
    return null
  }
}

async function probeFrameImage(task: NonNullable<typeof currentTask.value>): Promise<void> {
  const probeGeneration = ++frameImageProbeGeneration
  frameImageLoadState.value = frameImageRetryCount.value > 0 ? 'pending' : 'probing'
  try {
    const response = await axiosInstance.get(task.data.imageUrl, {
      responseType: 'blob',
      validateStatus: () => true
    })
    if (probeGeneration !== frameImageProbeGeneration || currentTask.value?.id !== task.id) return

    const contentType = String(response.headers?.['content-type'] ?? '').toLowerCase()
    if (response.status === 200 && contentType.startsWith('image/')) {
      frameImageRequestUrl.value = withCacheBuster(task.data.imageUrl)
      frameImageLoadState.value = 'loading'
      return
    }
    if (response.status === 202) {
      if (frameImageRetryCount.value >= FRAME_IMAGE_RETRY_LIMIT) {
        frameImageLoadState.value = 'failed'
        return
      }
      frameImageRetryCount.value += 1
      frameImageLoadState.value = 'pending'
      scheduleFrameImageRetry(task)
      return
    }
    if (response.status === 409) {
      errorMessage.value = (await extractPendingMessage(response.data)) ?? errorMessage.value
      frameImageLoadState.value = 'failed'
      return
    }
    frameImageLoadState.value = 'failed'
  } catch {
    if (probeGeneration !== frameImageProbeGeneration || currentTask.value?.id !== task.id) return
    frameImageLoadState.value = 'failed'
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function imagePointFromPointerEvent(event: PointerEvent): ImagePoint | null {
  const image = frameImageElement.value
  if (!image || image.naturalWidth <= 0 || image.naturalHeight <= 0) return null
  const rect = image.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null

  const displayX = clamp(event.clientX - rect.left, 0, rect.width)
  const displayY = clamp(event.clientY - rect.top, 0, rect.height)
  return {
    x: (displayX / rect.width) * image.naturalWidth,
    y: (displayY / rect.height) * image.naturalHeight,
    imageWidth: image.naturalWidth,
    imageHeight: image.naturalHeight
  }
}

function buildBoxDraft(start: ImagePoint, current: ImagePoint): FrameBoxAnnotationDraft | null {
  if (!currentTask.value || !selectedBoxLabel.value) return null
  const x = Math.min(start.x, current.x)
  const y = Math.min(start.y, current.y)
  const width = Math.abs(current.x - start.x)
  const height = Math.abs(current.y - start.y)
  return {
    id: null,
    clientId: uuidv7(),
    frameId: currentTask.value.data.frameId,
    labelId: selectedBoxLabel.value.id,
    labelName: selectedBoxLabel.value.name,
    value: true,
    floatValue: null,
    x,
    y,
    width,
    height,
    imageWidth: current.imageWidth,
    imageHeight: current.imageHeight,
    annotator: activeAnnotatorPrincipal.value,
    externalAnnotationId: uuidv7()
  }
}

function startBoxDraft(event: PointerEvent): void {
  if (!selectedBoxLabel.value || isSavingBoxAnnotations.value) return
  const point = imagePointFromPointerEvent(event)
  if (!point) return
  boxDraftStart = point
  draftBox.value = buildBoxDraft(point, point)
  boxAnnotationError.value = null
  const target = event.currentTarget as HTMLElement | null
  target?.setPointerCapture?.(event.pointerId)
  event.preventDefault()
}

function updateBoxDraft(event: PointerEvent): void {
  if (!boxDraftStart) return
  const point = imagePointFromPointerEvent(event)
  if (!point) return
  draftBox.value = buildBoxDraft(boxDraftStart, point)
  event.preventDefault()
}

function finishBoxDraft(event?: PointerEvent): void {
  if (!boxDraftStart || !draftBox.value) return
  const finishedBox = draftBox.value
  boxDraftStart = null
  draftBox.value = null
  if (event) {
    const target = event.currentTarget as HTMLElement | null
    target?.releasePointerCapture?.(event.pointerId)
  }
  if (finishedBox.width < 3 || finishedBox.height < 3) return
  boxAnnotations.value = [...boxAnnotations.value, finishedBox]
  activeBoxClientId.value = finishedBox.clientId
}

function cancelBoxDraft(): void {
  boxDraftStart = null
  draftBox.value = null
}

function boxAnnotationStyle(box: FrameBoxAnnotationDraft): Record<string, string> {
  const imageWidth = box.imageWidth || 1
  const imageHeight = box.imageHeight || 1
  return {
    left: `${(box.x / imageWidth) * 100}%`,
    top: `${(box.y / imageHeight) * 100}%`,
    width: `${(box.width / imageWidth) * 100}%`,
    height: `${(box.height / imageHeight) * 100}%`
  }
}

function formatBoxAnnotation(box: FrameBoxAnnotationDraft): string {
  return [
    `x ${Math.round(box.x)}`,
    `y ${Math.round(box.y)}`,
    `w ${Math.round(box.width)}`,
    `h ${Math.round(box.height)}`
  ].join(' / ')
}

function removeBoxAnnotation(clientId: string): void {
  boxAnnotations.value = boxAnnotations.value.filter((box) => box.clientId !== clientId)
  if (activeBoxClientId.value === clientId) {
    activeBoxClientId.value = null
  }
}

function clearBoxAnnotations(): void {
  boxAnnotations.value = []
  activeBoxClientId.value = null
  cancelBoxDraft()
}

async function submitEmptyPhiBackgroundFrame(): Promise<void> {
  usePhiRegionAnnotationPreset()
  clearBoxAnnotations()
  await submitBoxAnnotations()
}

function extractBoxAnnotationPayload(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    )
  }
  if (!payload || typeof payload !== 'object') return []
  const obj = payload as Record<string, unknown>
  if (Array.isArray(obj.annotations)) {
    return obj.annotations.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    )
  }
  if (Array.isArray(obj.results)) {
    return obj.results.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    )
  }
  return []
}

function parseBoxAnnotation(raw: Record<string, unknown>): FrameBoxAnnotationDraft | null {
  const id = parseOptionalNumber(raw.id)
  const frameId = parseOptionalNumber(raw.frameId ?? raw.frame_id)
  const labelId = parseOptionalNumber(raw.labelId ?? raw.label_id)
  const x = parseOptionalNumber(raw.x)
  const y = parseOptionalNumber(raw.y)
  const width = parseOptionalNumber(raw.width)
  const height = parseOptionalNumber(raw.height)
  const imageWidth = parseOptionalNumber(raw.imageWidth ?? raw.image_width)
  const imageHeight = parseOptionalNumber(raw.imageHeight ?? raw.image_height)
  const labelNameRaw = raw.labelName ?? raw.label_name
  const labelName = typeof labelNameRaw === 'string' ? labelNameRaw.trim() : ''
  if (
    frameId === null ||
    labelId === null ||
    x === null ||
    y === null ||
    width === null ||
    height === null ||
    imageWidth === null ||
    imageHeight === null ||
    !labelName
  ) {
    return null
  }
  const externalRaw = raw.externalAnnotationId ?? raw.external_annotation_id
  const annotatorRaw = raw.annotator
  const floatValue = parseOptionalNumber(raw.floatValue ?? raw.float_value)
  return {
    id,
    clientId: id !== null ? `box-${id}` : uuidv7(),
    frameId,
    labelId,
    labelName,
    value: raw.value !== false,
    floatValue,
    x,
    y,
    width,
    height,
    imageWidth,
    imageHeight,
    annotator: typeof annotatorRaw === 'string' ? annotatorRaw : activeAnnotatorPrincipal.value,
    externalAnnotationId:
      typeof externalRaw === 'string' && externalRaw.trim() ? externalRaw.trim() : uuidv7()
  }
}

async function loadBoxAnnotationsForTask(task: typeof currentTask.value): Promise<void> {
  if (!task) {
    resetBoxAnnotationState()
    return
  }
  isLoadingBoxAnnotations.value = true
  boxAnnotationError.value = null
  try {
    const res = await axiosInstance.get(r(endpoints.annotation.frameBoxes), {
      params: {
        frame_id: task.data.frameId,
        information_source_name: informationSource.value,
        annotator: activeAnnotatorPrincipal.value
      }
    })
    boxAnnotations.value = extractBoxAnnotationPayload(res.data)
      .map((item) => parseBoxAnnotation(item))
      .filter((box): box is FrameBoxAnnotationDraft => box !== null)
    activeBoxClientId.value = boxAnnotations.value[0]?.clientId ?? null
    ensureSelectedBoxLabel()
  } catch (error: any) {
    boxAnnotations.value = []
    boxAnnotationError.value =
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      error?.message ||
      'Box-Annotationen konnten nicht geladen werden.'
  } finally {
    isLoadingBoxAnnotations.value = false
  }
}

async function submitBoxAnnotations(): Promise<void> {
  if (!currentTask.value) return
  const task = currentTask.value
  isSavingBoxAnnotations.value = true
  boxAnnotationError.value = null
  try {
    await axiosInstance.post(r(endpoints.annotation.frameBoxes), {
      frame_id: task.data.frameId,
      replace: true,
      information_source_name: informationSource.value,
      annotator: activeAnnotatorPrincipal.value,
      annotations: boxAnnotations.value.map((box) => ({
        id: box.id,
        frame_id: task.data.frameId,
        label_id: box.labelId,
        value: box.value,
        float_value: box.floatValue,
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
        image_width: Math.round(box.imageWidth),
        image_height: Math.round(box.imageHeight),
        information_source_name: informationSource.value,
        annotator: activeAnnotatorPrincipal.value,
        external_annotation_id: box.externalAnnotationId,
        model_meta_id: null
      }))
    })
    await loadBoxAnnotationsForTask(task)
  } catch (error: any) {
    boxAnnotationError.value =
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      error?.message ||
      'Box-Annotationen konnten nicht gespeichert werden.'
  } finally {
    isSavingBoxAnnotations.value = false
  }
}

function formatConfidence(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return ''
  return `${Math.round(value * 100)}%`
}

function syncAnnotatorOverrideFromStorage(): void {
  annotatorOverride.value = loadAnnotatorOverride(
    annotatorOverrideScope.value,
    baseAnnotatorPrincipal.value
  )
  annotatorOverrideInput.value = annotatorOverride.value ?? ''
}

function applyActiveAnnotatorToQueue(): void {
  queueStore.setAnnotatorPrincipal?.(activeAnnotatorPrincipal.value)
}

async function reloadAnnotationQueue(): Promise<void> {
  isReloadingAnnotationQueue = true
  try {
    queueStore.clearQueue()
    await loadNextTask()
  } finally {
    isReloadingAnnotationQueue = false
  }
}

async function restartAnnotationAsOverride(): Promise<void> {
  const normalized = annotatorOverrideInput.value.trim()
  if (!normalized) return
  saveAnnotatorOverride(annotatorOverrideScope.value, baseAnnotatorPrincipal.value, normalized)
  annotatorOverride.value = normalized
  await reloadAnnotationQueue()
}

async function revertAnnotatorOverride(): Promise<void> {
  clearAnnotatorOverride(annotatorOverrideScope.value, baseAnnotatorPrincipal.value)
  annotatorOverride.value = null
  annotatorOverrideInput.value = ''
  await reloadAnnotationQueue()
}

function extractListPayload(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    )
  }
  if (!payload || typeof payload !== 'object') return []
  const obj = payload as Record<string, unknown>
  if (Array.isArray(obj.results)) {
    return obj.results.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    )
  }
  if (Array.isArray(obj.labels)) {
    return obj.labels.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    )
  }
  if (Array.isArray(obj.labelSets)) {
    return obj.labelSets.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    )
  }
  if (Array.isArray(obj.label_sets)) {
    return obj.label_sets.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    )
  }
  if (Array.isArray(obj.groups)) {
    return obj.groups.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    )
  }
  return []
}

function parseOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function parseGroupOption(raw: Record<string, unknown>): LabelGroupOption | null {
  const nestedLabelGroup =
    raw.labelGroup && typeof raw.labelGroup === 'object'
      ? (raw.labelGroup as Record<string, unknown>)
      : raw.label_group && typeof raw.label_group === 'object'
        ? (raw.label_group as Record<string, unknown>)
        : null

  const groupIdRaw =
    raw.labelGroupId ??
    raw.label_group_id ??
    raw.groupId ??
    raw.group_id ??
    nestedLabelGroup?.id ??
    raw.id
  if (
    groupIdRaw === null ||
    groupIdRaw === undefined ||
    (typeof groupIdRaw !== 'string' && typeof groupIdRaw !== 'number')
  ) {
    return null
  }

  const id = String(groupIdRaw).trim()
  if (!id) return null

  const nameRaw =
    raw.labelGroupName ??
    raw.label_group_name ??
    raw.groupName ??
    raw.group_name ??
    nestedLabelGroup?.name ??
    raw.name
  const name = typeof nameRaw === 'string' && nameRaw.trim() ? nameRaw.trim() : `Group ${id}`
  const version = parseOptionalNumber(raw.version ?? nestedLabelGroup?.version)
  const labelCount = parseOptionalNumber(
    raw.labelCount ??
      raw.label_count ??
      nestedLabelGroup?.labelCount ??
      nestedLabelGroup?.label_count
  )
  const displayParts = [name]
  if (version !== null) displayParts.push(`v${version}`)
  if (labelCount !== null) displayParts.push(`${labelCount} Labels`)

  return { id, name, version, labelCount, displayName: displayParts.join(' - ') }
}

async function loadLabelGroups(): Promise<void> {
  isLoadingLabelGroups.value = true
  labelGroupLoadError.value = null
  try {
    const res = await axiosInstance.get(r(endpoints.media.videoLabelSetsList))
    const rows = extractListPayload(res.data)
    const byId = new Map<string, LabelGroupOption>()
    for (const row of rows) {
      const parsed = parseGroupOption(row)
      if (!parsed) continue
      if (!byId.has(parsed.id)) {
        byId.set(parsed.id, parsed)
      }
    }
    labelGroupOptions.value = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))

    if (!selectedLabelGroupId.value && labelGroupOptions.value.length > 0) {
      selectedLabelGroupId.value = labelGroupOptions.value[0].id
    }
  } catch (error: any) {
    labelGroupOptions.value = []
    labelGroupLoadError.value =
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      error?.message ||
      'Label-Gruppen konnten nicht geladen werden.'
  } finally {
    isLoadingLabelGroups.value = false
  }
}

async function loadAiDatasets(): Promise<void> {
  isLoadingAiDatasets.value = true
  aiDatasetLoadError.value = null
  try {
    aiDatasetOptions.value = await fetchAiDatasetOptions()
  } catch (error: any) {
    aiDatasetOptions.value = []
    aiDatasetLoadError.value =
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      error?.message ||
      'KI-Datensätze konnten nicht geladen werden.'
  } finally {
    isLoadingAiDatasets.value = false
  }
}

async function loadNextTask(): Promise<void> {
  isLoadingTask.value = true
  errorMessage.value = null
  try {
    applyActiveAnnotatorToQueue()
    if (!queueStore.taskQueue.length) {
      await queueStore.fetchBatch(10)
    }
    currentTask.value = queueStore.popNextTask() ?? null
    resetBoxAnnotationState()
    syncSelectedLabelsFromTask(currentTask.value)
    await loadBoxAnnotationsForTask(currentTask.value)
    if (!currentTask.value && queueStore.lastError) {
      errorMessage.value = queueStore.lastError
    }
  } catch (error: any) {
    currentTask.value = null
    errorMessage.value =
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      error?.message ||
      'Aufgabe konnte nicht geladen werden.'
  } finally {
    isLoadingTask.value = false
  }
}

function getTargetLabelId(task: NonNullable<typeof currentTask.value>): number | null {
  const targetLabel = queueStore.targetLabelName.trim().toLowerCase()
  if (!targetLabel) return null

  const match = (task.data.labelOptions ?? []).find(
    (label) => label.name.trim().toLowerCase() === targetLabel
  )
  return match?.id ?? null
}

async function submitLabelsWithSelection(selectedIds: number[]): Promise<void> {
  if (!currentTask.value) return
  const task = currentTask.value
  const labelOptions = task.data.labelOptions ?? []
  if (labelOptions.length === 0) {
    errorMessage.value = 'Für diesen Frame sind keine Labels verfügbar.'
    return
  }
  isSubmitting.value = true
  errorMessage.value = null
  const selectedSet = new Set(selectedIds)
  try {
    const annotations = labelOptions.map((label) => {
      const existingManual = (task.data.manualAnnotations ?? []).find(
        (annotation) => annotation.labelId === label.id
      )
      return {
        frameId: task.data.frameId,
        labelId: label.id,
        value: selectedSet.has(label.id),
        floatValue: null,
        informationSourceName: informationSource.value,
        annotator: activeAnnotatorPrincipal.value,
        externalAnnotationId:
          existingManual?.externalAnnotationId ||
          (task.data.existingExternalId && task.data.existingExternalId.trim()
            ? `${task.data.existingExternalId}:${label.id}`
            : uuidv7()),
        modelMetaId: null
      }
    })
    const payload: {
      videoId?: number
      aiDatasetId?: number
      annotations: typeof annotations
    } = {
      annotations
    }
    if (task.data.videoId !== undefined) {
      payload.videoId = task.data.videoId
    }
    const selectedAiDatasetId = Number(queueStore.aiDatasetId)
    if (Number.isFinite(selectedAiDatasetId) && selectedAiDatasetId > 0) {
      payload.aiDatasetId = selectedAiDatasetId
    }
    await axiosInstance.post(r(endpoints.annotation.bulkUpsert), payload)
    await loadNextTask()
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      error?.message ||
      'Annotation konnte nicht gespeichert werden.'
  } finally {
    isSubmitting.value = false
  }
}

async function submitLabels(): Promise<void> {
  await submitLabelsWithSelection(selectedLabelIds.value)
}

async function submitPositiveExample(): Promise<void> {
  if (!currentTask.value) return
  const targetLabelId = getTargetLabelId(currentTask.value)
  if (targetLabelId === null) {
    errorMessage.value = `Ziel-Label "${queueStore.targetLabelName}" ist für diesen Frame nicht verfügbar.`
    return
  }

  const nextSelection = new Set(selectedLabelIds.value)
  nextSelection.add(targetLabelId)
  selectedLabelIds.value = [...nextSelection]
  await submitLabelsWithSelection(selectedLabelIds.value)
}

async function submitNegativeExample(): Promise<void> {
  if (!currentTask.value) return
  const targetLabelId = getTargetLabelId(currentTask.value)
  if (targetLabelId === null) {
    errorMessage.value = `Ziel-Label "${queueStore.targetLabelName}" ist für diesen Frame nicht verfügbar.`
    return
  }

  const nextSelection = new Set(selectedLabelIds.value)
  nextSelection.delete(targetLabelId)
  selectedLabelIds.value = [...nextSelection]
  await submitLabelsWithSelection(selectedLabelIds.value)
}

async function skipTask(): Promise<void> {
  if (!currentTask.value) return
  const task = currentTask.value
  isSubmitting.value = true
  errorMessage.value = null
  try {
    await axiosInstance.post(r(endpoints.annotation.skip), {
      frameId: task.data.frameId,
      videoId: task.data.videoId,
      annotator: activeAnnotatorPrincipal.value,
      informationSourceName: informationSource.value
    })
    await loadNextTask()
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      error?.message ||
      'Aufgabe konnte nicht übersprungen werden.'
  } finally {
    isSubmitting.value = false
  }
}

watch(
  [baseAnnotatorPrincipal, annotatorOverrideScope],
  () => {
    syncAnnotatorOverrideFromStorage()
    applyActiveAnnotatorToQueue()
  },
  { immediate: true }
)

watch(
  () => currentTask.value?.id,
  async () => {
    resetFrameImageState(currentTask.value)
    syncSelectedLabelsFromTask(currentTask.value)
    ensureSelectedBoxLabel()
    if (currentTask.value) {
      await probeFrameImage(currentTask.value)
    }
  }
)

watch(
  () => [queueStore.selectedLabelGroupId, queueStore.taskQuerySignature],
  async () => {
    if (isBootstrappingAnnotationQueue || isReloadingAnnotationQueue) return
    queueStore.clearQueue()
    await loadNextTask()
  }
)

onMounted(async () => {
  try {
    applyRoutePreset()
    await loadAiDatasets()
    await loadLabelGroups()
    await loadNextTask()
  } finally {
    isBootstrappingAnnotationQueue = false
  }
})

onUnmounted(() => {
  clearFrameImageRetryTimer()
})
</script>

<style scoped>
.frame-card {
  min-height: 320px;
}

.task-meta {
  font-size: 0.875rem;
}

.label-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.label-option {
  background: #fff;
}

.frame-image-stage {
  position: relative;
  display: inline-block;
  max-width: 100%;
  line-height: 0;
  cursor: crosshair;
  user-select: none;
}

.frame-image {
  display: block;
  max-width: 100%;
  height: auto;
}

.frame-image-status {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem;
  color: #334155;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(1px);
  pointer-events: auto;
}

.box-annotation-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.box-annotation-rect {
  position: absolute;
  border: 2px solid #0d6efd;
  background: rgba(13, 110, 253, 0.12);
  pointer-events: auto;
}

.box-annotation-rect span {
  position: absolute;
  top: -1.6rem;
  left: -2px;
  max-width: 180px;
  padding: 0.125rem 0.35rem;
  overflow: hidden;
  color: #fff;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: #0d6efd;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  line-height: 1.2;
}

.box-annotation-rect-active {
  border-color: #198754;
  background: rgba(25, 135, 84, 0.14);
}

.box-annotation-rect-draft {
  border-style: dashed;
}

.box-annotation-panel {
  background: #fbfcfe;
}

.box-annotation-list {
  display: grid;
  gap: 0.5rem;
}

.box-annotation-list-item {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.625rem;
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
}

.box-annotation-list-item-active {
  border-color: #198754;
}

.anonymizer-field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.5rem;
}

.anonymizer-field-option {
  background: #fff;
  min-height: 76px;
}

.anonymizer-field-option-missing {
  background: #fff9e8;
}

.annotator-override-input {
  max-width: 320px;
}

/* Match the rounded/outlined interaction feel used by sidebar nav links. */
.sidebar-action-button {
  border-radius: 0.5rem;
  border-width: 1px;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.sidebar-action-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
}

.sidebar-action-button:focus-visible {
  outline: 2px solid #9dc2ff;
  outline-offset: 1px;
}
</style>
