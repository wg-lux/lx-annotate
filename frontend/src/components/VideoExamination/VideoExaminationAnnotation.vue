<template>
  <div class="container-fluid py-4">
    <!-- User message / hint -->
    <div
      v-if="errorMessage"
      class="alert alert-dismissible fade show"
      :class="messageTone === 'danger' ? 'alert-danger' : 'alert-info hint-alert'"
      :role="messageTone === 'danger' ? 'alert' : 'status'"
    >
      <i
        class="ni me-2"
        :class="messageTone === 'danger' ? 'ni-settings-gear-65' : 'ni-bulb-61'"
      ></i>
      <strong>{{ messageTone === 'danger' ? 'Achtung:' : 'Hinweis:' }}</strong> {{ errorMessage }}
      <button
        type="button"
        class="btn-close"
        @click="clearErrorMessage"
        aria-label="Close"
      ></button>
    </div>

    <!-- Success Message Alert -->
    <div v-if="successMessage" class="alert alert-success alert-dismissible fade show" role="alert">
      <i class="ni ni-check-bold me-2"></i>
      <strong>Erfolg:</strong> {{ successMessage }}
      <button
        type="button"
        class="btn-close"
        @click="clearSuccessMessage"
        aria-label="Close"
      ></button>
    </div>

    <div class="row">
      <div class="col-12">
        <h1>Video-Untersuchung</h1>
        <p>
          Wählen Sie ein Video aus, prüfen Sie die Segmente und setzen Sie die Befundung im nächsten
          Schritt fort.
        </p>
      </div>
    </div>

    <div class="row">
      <!-- Video Player Section -->
      <div class="col-lg-12">
        <div class="card">
          <div class="card-header pb-0">
            <h5 class="mb-0">Videoansicht</h5>
          </div>
          <div class="card-body">
            <!-- Video Selection -->
            <div class="mb-3">
              <label class="form-label">Video auswählen:</label>
              <div ref="videoDropdownRef" class="video-dropdown">
                <button
                  type="button"
                  class="video-dropdown-trigger"
                  :disabled="!hasVideos"
                  :aria-expanded="isVideoDropdownOpen ? 'true' : 'false'"
                  aria-haspopup="listbox"
                  @click="toggleVideoDropdown"
                >
                  <span class="video-dropdown-trigger-text">{{ selectedVideoLabel }}</span>
                  <i
                    class="ni"
                    :class="isVideoDropdownOpen ? 'ni-bold-right' : 'ni-bold-right'"
                  ></i>
                </button>
                <div
                  v-if="isVideoDropdownOpen && hasVideos"
                  class="video-dropdown-menu"
                  role="listbox"
                >
                  <div class="video-dropdown-search">
                    <input
                      v-model="videoDropdownSearch"
                      type="search"
                      class="video-dropdown-search-input"
                      placeholder="Video suchen..."
                      aria-label="Video suchen"
                      @click.stop
                      @keydown.stop
                    />
                  </div>
                  <div class="video-dropdown-filters" role="group" aria-label="Videofilter">
                    <button
                      v-for="option in videoDropdownFilterOptions"
                      :key="option.value"
                      type="button"
                      class="video-dropdown-filter-button"
                      :class="{ active: videoDropdownFilter === option.value }"
                      @click.stop="videoDropdownFilter = option.value"
                    >
                      {{ option.label }}
                    </button>
                  </div>
                  <button
                    v-for="video in filteredSelectableVideos"
                    :key="video.id"
                    type="button"
                    class="video-dropdown-item"
                    :class="[
                      { 'video-dropdown-item-selected': selectedVideoId === video.id },
                      getVideoDropdownItemClass(video.id)
                    ]"
                    @click="selectVideoFromDropdown(video.id)"
                  >
                    <div class="video-dropdown-main">
                      <span class="video-dropdown-title">
                        <i class="ni ni-button-play me-1"></i>
                        {{ video.original_file_name || 'Video Nr. ' + video.id }}
                      </span>
                      <span
                        class="video-dropdown-status-badge"
                        :class="getVideoDropdownStatusBadgeClass(video.id)"
                      >
                        {{ getVideoDropdownStatusText(video.id) }}
                      </span>
                    </div>
                    <div class="video-dropdown-meta">
                      <span>| Center: {{ video.centerName || 'Unbekannt' }}</span>
                      <span>| Geschlecht: {{ getVideoPatientGender(video.id) }}</span>
                      <span>| Alter: {{ getVideoPatientAgeLabel(video.id) }}</span>
                    </div>
                    <div
                      v-if="getVideoValidatedAnnotatorLabel(video.id)"
                      class="video-dropdown-annotators"
                      :class="{
                        'video-dropdown-annotators-other': hasOtherValidatedAnnotator(video.id)
                      }"
                      data-test="video-dropdown-annotators"
                    >
                      <i class="ni ni-single-02 me-1"></i>
                      {{ getVideoValidatedAnnotatorLabel(video.id) }}
                    </div>
                  </button>
                  <div v-if="filteredSelectableVideos.length === 0" class="video-dropdown-empty">
                    Keine Videos gefunden.
                  </div>
                </div>
              </div>
              <small v-if="!hasVideos" class="text-muted">
                {{ noVideosMessage }}
              </small>

              <!-- ✅ NEW: Video Status Summary -->
              <div v-if="videos.length > 0" class="mt-2">
                <div class="d-flex flex-wrap gap-2 align-items-center">
                  <small class="text-muted">Status-Übersicht:</small>
                  <span class="badge bg-success">
                    <i class="ni ni-check-bold me-1"></i>
                    {{ getVideoCountByStatus('done_processing_anonymization') }} Anonymisiert
                  </span>
                  <span class="badge bg-primary">
                    <i class="ni ni-check-bold me-1"></i>
                    {{ getVideoCountByStatus('validated') }} Validiert
                  </span>
                  <span class="badge bg-secondary">
                    <i class="ni ni-user-run me-1"></i>
                    {{ pendingValidationVideos.length }} Ausstehend
                  </span>
                </div>
              </div>
              <div
                v-if="selectedVideoId && canAnnotateSelectedVideo"
                class="annotation-scope-panel mt-2"
              >
                <label for="video-annotator-override" class="form-label mb-1"
                  >Annotator-Scope</label
                >
                <div class="d-flex flex-wrap gap-2">
                  <input
                    id="video-annotator-override"
                    v-model.trim="annotatorOverrideInput"
                    type="text"
                    class="form-control form-control-sm annotator-override-input"
                    data-test="video-annotator-override-input"
                    :placeholder="baseAnnotatorPrincipal"
                  />
                  <button
                    type="button"
                    class="btn btn-outline-primary btn-sm mb-0"
                    :disabled="!canApplyAnnotatorOverride"
                    data-test="video-annotator-override-apply"
                    @click="restartVideoAnnotationAsOverride"
                  >
                    Annotation als anderer Nutzer neu starten
                  </button>
                  <button
                    v-if="isAnnotatorOverrideActive"
                    type="button"
                    class="btn btn-outline-secondary btn-sm mb-0"
                    data-test="video-annotator-override-revert"
                    @click="revertVideoAnnotatorOverride"
                  >
                    Zurück zu meinem Nutzer
                  </button>
                </div>
                <small class="text-muted d-block mt-1"
                  >Aktiver Annotator: {{ activeAnnotatorLabel }}</small
                >
              </div>
            </div>

            <div
              v-if="validationRequestVideoId !== null || lastValidationClickedVideoId !== null"
              class="mt-2 p-2 rounded validation-click-indicator"
              :class="
                selectedVideoId === activeValidationIndicatorVideoId
                  ? 'validation-click-indicator-active'
                  : 'validation-click-indicator-muted'
              "
            >
              <small class="fw-semibold">
                <i
                  class="ni me-1"
                  :class="isValidatingSegments ? 'ni-settings-gear-65' : 'ni-single-copy-04'"
                ></i>
                <span v-if="isValidatingSegments">
                  Validierung läuft für Video {{ validationRequestVideoId }}
                </span>
                <span
                  v-else-if="
                    activeValidationIndicatorVideoId &&
                    isSegmentCleanupPending(activeValidationIndicatorVideoId)
                  "
                >
                  Außerhalb-Frames werden für Video
                  {{ activeValidationIndicatorVideoId }} geschwärzt
                </span>
                <span v-else>
                  Letzte Segmentvalidierung für Video
                  {{ lastValidationClickedVideoId }}
                </span>
              </small>
            </div>

            <!-- No Video Selected State -->
            <div v-if="!anonymizedVideoSrc && hasVideos" class="text-center text-muted py-5">
              <i class="ni ni-button-play ni-3x"></i>
              <p class="mt-2">
                {{
                  selectedVideoId && !isSelectedVideoViewable
                    ? 'Dieses Video ist noch nicht für die Segmentansicht nutzbar'
                    : 'Video auswählen, um mit der Betrachtung zu beginnen'
                }}
              </p>

              <!-- ✅ NEW: Enhanced video status info when selected but not loaded -->
              <div v-if="selectedVideoId" class="alert alert-info mt-2">
                <div class="d-flex align-items-center justify-content-center">
                  <i class="ni ni-user-run me-2"></i>
                  <div class="text-start">
                    <strong>Video {{ selectedVideoId }}:</strong>
                    {{ getVideoStatusIndicator(selectedVideoId) }}<br />
                    <small class="text-muted">
                      {{
                        isSelectedVideoViewable
                          ? 'Die Ansicht wird vorbereitet.'
                          : 'Bitte zuerst den erforderlichen Anonymisierungsschritt abschließen.'
                      }}
                    </small>
                  </div>
                </div>
              </div>
            </div>

            <!-- No Videos Available State -->
            <div v-if="!hasVideos" class="text-center text-muted py-5">
              <i class="ni ni-collection ni-3x"></i>
              <p class="mt-2">{{ noVideosMessage }}</p>
              <small
                >Videos können über den Ordner Raw Videos hochgeladen werden. Nicht nutzbare Videos
                erscheinen in der Auswahl mit ihrem aktuellen Status.</small
              >
            </div>

            <!-- Video Player -->
            <div v-if="anonymizedVideoSrc" ref="videoContainerRef" class="video-container">
              <button
                type="button"
                class="fullscreen-toggle"
                @click="toggleFullscreen"
                :title="isFullscreen ? 'Vollbild verlassen' : 'Vollbild'"
              >
                <i class="ni" :class="isFullscreen ? 'ni-settings-gear-65' : 'ni-tv-2'"></i>
              </button>
              <video
                ref="videoRef"
                data-cy="video-player"
                :src="anonymizedVideoSrc"
                @timeupdate="handleTimeUpdate"
                @loadedmetadata="onVideoLoaded"
                @error="onVideoError"
                @loadstart="onVideoLoadStart"
                @canplay="onVideoCanPlay"
                controls
                class="w-100"
                style="max-height: 400px"
              >
                Ihr Browser unterstützt das Video-Element nicht.
              </video>
              <div v-if="isLabelSelectActive" class="label-overlay" @click.self="closeLabelOverlay">
                <div class="label-overlay-card">
                  <div class="label-overlay-header">
                    <span>Label auswählen</span>
                    <button type="button" class="label-overlay-close" @click="closeLabelOverlay">
                      ×
                    </button>
                  </div>
                  <div class="label-overlay-hint">
                    ↑/↓ wechseln · Enter übernehmen · Esc schließen
                  </div>
                  <div class="label-overlay-list">
                    <button
                      v-for="label in timelineLabels"
                      :key="label.id"
                      type="button"
                      class="label-overlay-item"
                      :class="{ active: label.name === selectedLabelType }"
                      @click="selectLabelFromOverlay(label.name)"
                    >
                      {{ getTranslationForLabel(label.name) }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- ✅ NEW: Video Status and Information Card -->
              <div v-if="selectedVideoId" class="mt-3 p-3 rounded border video-status-card">
                <div class="row align-items-center">
                  <div class="col-md-8">
                    <h6 class="mb-1">
                      <i class="ni ni-button-play me-2 text-primary"></i>
                      {{ selectedVideo?.original_file_name || `Video ${selectedVideoId}` }}
                    </h6>
                    <div class="status-badge-container mb-2">
                      <span
                        :class="
                          getStatusBadgeClass(
                            overview.find(
                              (o) => o.id === selectedVideoId && o.mediaType === 'video'
                            )?.anonymizationStatus || 'not_started'
                          )
                        "
                        class="badge"
                      >
                        <i class="ni ni-check-bold me-1"></i>
                        {{
                          getStatusText(
                            overview.find(
                              (o) => o.id === selectedVideoId && o.mediaType === 'video'
                            )?.anonymizationStatus || 'not_started'
                          )
                        }}
                      </span>
                      <span
                        v-if="timelineSegmentsForSelectedVideo.length > 0"
                        class="badge bg-info"
                      >
                        <i class="ni ni-single-copy-04 me-1"></i>
                        {{ timelineSegmentsForSelectedVideo.length }} Segmente
                      </span>
                      <span v-if="savedExaminations.length > 0" class="badge bg-warning">
                        <i class="ni ni-user-run me-1"></i>
                        {{ savedExaminations.length }} Untersuchungen
                      </span>
                      <span
                        v-if="
                          selectedVideoId && getSegmentAnnotationStatusBadgeText(selectedVideoId)
                        "
                        class="badge"
                        :class="getSegmentAnnotationStatusBadgeClass(selectedVideoId)"
                      >
                        <i class="ni ni-settings-gear-65 me-1"></i>
                        {{ getSegmentAnnotationStatusBadgeText(selectedVideoId) }}
                      </span>
                    </div>
                  </div>
                  <div class="col-md-4 text-md-end">
                    <small class="text-muted d-block"
                      >Center: {{ selectedVideo?.centerName || 'Unbekannt' }}</small
                    >
                    <small class="text-muted d-block">Dauer: {{ formatTime(duration) }}</small>
                  </div>
                </div>
              </div>
            </div>
            <!-- Enhanced Timeline Component -->
            <div v-if="duration > 0" class="timeline-wrapper mt-3">
              <Timeline
                :video="{ duration }"
                :segments="timelineSegmentsForSelectedVideo"
                :labels="timelineLabels"
                :currentTime="currentTime"
                :isPlaying="isPlaying"
                :activeSegmentId="selectedSegmentId"
                :showWaveform="false"
                :selectionMode="canMutateSelectedSegments"
                :fps="fps"
                @seek="handleTimelineSeek"
                @play-pause="handlePlayPause"
                @segment-select="handleSegmentSelect"
                @segment-label-change="handleSegmentLabelChange"
                @segment-resize="handleSegmentResize"
                @segment-move="handleSegmentMove"
                @segment-create="handleCreateSegment"
                @segment-delete="handleSegmentDelete"
                @time-selection="handleTimeSelection"
              />
              <details class="mt-2 text-muted shortcuts-details" style="font-size: 0.85rem">
                <summary class="shortcuts-toggle" aria-label="Shortcuts anzeigen">
                  <span class="shortcuts-icon">?</span>
                  <span>Shortcuts</span>
                </summary>
                <div class="mt-1 shortcuts-body">
                  O = Labelauswahl · ↑/↓ = Label wechseln · Enter = Label übernehmen · F = Vollbild
                  · , / . = Frame zurück/vor · K / L = 5s zurück/vor · Ctrl/Cmd + C = Segment
                  kopieren · Ctrl/Cmd + V = Segment einfügen · Ctrl/Cmd + Z = Löschen rückgängig ·
                  Delete/Backspace = Segment löschen · Rechtsklick auf Segment = Start/Ende tippen ·
                  + = Segment-Start · - = Segment-Ende · Esc = Abbrechen
                </div>
              </details>
              <div
                v-if="selectedVideoId && isSelectedVideoViewable"
                class="mt-3 d-flex gap-2 flex-wrap align-items-center"
              >
                <select
                  v-model="segmentSourceMode"
                  class="form-select form-select-sm source-select"
                  @change="handleSegmentSourceChange"
                >
                  <option value="manual">Manuelle Segmente</option>
                  <option value="prediction">KI-Vorhersagen</option>
                </select>

                <button
                  class="btn btn-outline-secondary"
                  @click="discardSegmentChanges"
                  :disabled="segmentSourceMode === 'prediction' || !canMutateSelectedSegments"
                >
                  Änderungen verwerfen
                </button>

                <button
                  class="btn"
                  :class="hasUnsavedChanges ? 'btn-primary' : 'btn-outline-secondary'"
                  @click="saveSegmentChanges"
                  :disabled="segmentSourceMode === 'prediction' || !canMutateSelectedSegments"
                >
                  Segmentänderungen speichern
                </button>

                <button
                  v-if="segmentSourceMode === 'prediction'"
                  class="btn btn-primary"
                  :disabled="
                    timelineSegmentsForSelectedVideo.length === 0 ||
                    isImportingPredictionSegments ||
                    !canMutateSelectedSegments
                  "
                  @click="importPredictionSegmentsToManual"
                >
                  {{
                    isImportingPredictionSegments
                      ? 'Übernehme...'
                      : 'Als manuelle Segmente übernehmen'
                  }}
                </button>
              </div>

              <div
                v-if="selectedVideoId && isSelectedVideoViewable"
                class="prediction-rerun-controls mt-2 d-flex gap-2 flex-wrap align-items-center"
              >
                <select
                  v-model="predictionModelMode"
                  class="form-select form-select-sm model-mode-select"
                >
                  <option value="local">Lokales KI-Modell</option>
                  <option value="huggingface">Hugging Face</option>
                </select>

                <select
                  v-if="predictionModelMode === 'local'"
                  v-model.number="selectedPredictionModelMetaId"
                  class="form-select form-select-sm prediction-model-select"
                  :disabled="predictionModelOptions.length === 0 || isRerunningPredictionSegments"
                >
                  <option :value="null">KI-Modell auswählen...</option>
                  <option v-for="model in predictionModelOptions" :key="model.id" :value="model.id">
                    {{ formatPredictionModelOption(model) }}
                  </option>
                </select>

                <input
                  v-else
                  v-model.trim="huggingFaceModelId"
                  class="form-control form-control-sm huggingface-model-input"
                  placeholder="wg-lux/colo_segmentation_RegNetX800MF_base"
                  :disabled="isRerunningPredictionSegments"
                />

                <button
                  class="btn btn-outline-primary"
                  :disabled="!canRerunPredictionSegments"
                  @click="rerunPredictionSegmentsForSelectedVideo"
                >
                  {{ isRerunningPredictionSegments ? 'KI läuft...' : 'KI neu berechnen' }}
                </button>
              </div>

              <!-- Simple progress bar as fallback -->
              <div
                class="simple-timeline-track mt-2"
                @click="handleTimelineClick"
                ref="timelineRef"
              >
                <div
                  class="progress-bar"
                  :style="{ width: `${(currentTime / duration) * 100}%` }"
                ></div>
                <!-- Examination markers on timeline -->
                <div
                  v-for="marker in examinationMarkers"
                  :key="marker.id"
                  class="examination-marker"
                  :style="{ left: `${(marker.timestamp / duration) * 100}%` }"
                  :title="`Untersuchung bei ${formatTime(marker.timestamp)}`"
                ></div>
              </div>
            </div>

            <!-- Timeline Controls -->
            <div v-if="selectedVideoId && isSelectedVideoViewable" class="timeline-controls mt-4">
              <div class="d-flex align-items-center gap-3">
                <div
                  v-if="segmentSourceMode === 'prediction'"
                  class="alert alert-warning py-2 px-3 mb-0"
                >
                  KI-Segmente sind hier nur als Vorlage editierbar. Zum Speichern in die manuelle
                  Annotation den Button "Als manuelle Segmente übernehmen" verwenden.
                </div>
                <div class="d-flex align-items-center">
                  <label class="form-label mb-0 me-2">Neues Label setzen:</label>
                  <select
                    ref="labelSelectRef"
                    v-model="selectedLabelType"
                    @change="onLabelSelect"
                    @focus="isLabelSelectActive = true"
                    @blur="isLabelSelectActive = false"
                    class="form-select form-select-sm control-select"
                    data-cy="label-select"
                    :disabled="!canMutateSelectedSegments"
                  >
                    <option value="">Label auswählen...</option>
                    <option v-for="label in timelineLabels" :key="label.id" :value="label.name">
                      {{ getTranslationForLabel(label.name) }}
                    </option>
                  </select>
                </div>

                <div class="d-flex align-items-center gap-2">
                  <button
                    v-if="!isMarkingLabel"
                    @click="startLabelMarking"
                    class="btn btn-success btn-sm control-button"
                    :disabled="!canStartLabeling"
                    data-cy="start-label-button"
                  >
                    <i class="ni ni-single-copy-04"></i>
                    Label-Start setzen
                  </button>

                  <button
                    v-if="isMarkingLabel"
                    @click="finishLabelMarking"
                    class="btn btn-warning btn-sm control-button"
                    data-cy="finish-label-button"
                  >
                    <i class="ni ni-button-play"></i>
                    Label-Ende setzen
                  </button>

                  <button
                    v-if="isMarkingLabel"
                    @click="cancelLabelMarking"
                    class="btn btn-outline-secondary btn-sm control-button"
                  >
                    Abbrechen
                  </button>
                </div>

                <div class="ms-3 text-muted">
                  <p
                    v-if="videoStore.draftSegment && videoStore.draftSegment.startTime !== null"
                    class="mb-0"
                  >
                    Aktueller Label Start: {{ formatTime(videoStore.draftSegment.startTime) }}
                  </p>
                  Zeit: {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
                </div>
              </div>

              <!-- Draft-Info während Label-Erstellung -->
              <div v-if="videoStore.draftSegment" class="alert alert-info mt-2 mb-0">
                <small>
                  <i class="ni ni-user-run align-middle me-1" style="font-size: 16px"></i>
                  Label "{{ getTranslationForLabel(videoStore.draftSegment.label) }}"
                  <span v-if="videoStore.draftSegment.endTime">
                    von {{ formatTime(videoStore.draftSegment.startTime) }} bis
                    {{ formatTime(videoStore.draftSegment.endTime) }}
                  </span>
                  <span v-else>
                    startet bei {{ formatTime(videoStore.draftSegment.startTime) }} - Ende beim
                    nächsten Klick
                  </span>
                </small>
              </div>
            </div>
          </div>
        </div>

        <!-- ✅ Enhanced Validation Button with Status -->
        <div v-if="selectedVideoId && canAnnotateSelectedVideo" class="mt-3">
          <!-- Show different button based on annotation status -->
          <div
            v-if="isAnnotationFinished(selectedVideoId)"
            class="alert alert-success d-flex align-items-center validation-status-alert"
          >
            <i class="ni ni-check-bold ni-2x me-3 text-success"></i>
            <div class="validation-status-body">
              <h6 class="mb-1">
                <i class="ni ni-chart-bar-32 me-1"></i>
                {{
                  canMutateSelectedSegments ? 'Segmentbearbeitung aktiv' : 'Video bereits validiert'
                }}
              </h6>
              <small class="text-muted">
                <span v-if="canMutateSelectedSegments">
                  {{
                    isAnnotatorOverrideActive
                      ? 'Segmentänderungen laufen unter dem aktiven Annotator-Override. "Zurück zu meinem Nutzer" setzt den Scope zurück.'
                      : 'Segmentänderungen sind wieder möglich. Der Zurück-Button des Browsers beendet diesen Modus.'
                  }}
                </span>
                <span v-else>
                  Alle {{ timelineSegmentsForSelectedVideo.length }} Segmente wurden überprüft und
                  als validiert markiert.
                </span>
              </small>
            </div>
            <button
              v-if="isAnnotatorOverrideActive"
              type="button"
              class="btn btn-outline-primary btn-sm ms-auto validation-edit-button"
              :disabled="segmentSourceMode === 'prediction' || isValidatingSegments"
              :aria-busy="isValidatingSegments ? 'true' : 'false'"
              @click="handleValidateAndMark(selectedVideoId)"
            >
              <i
                class="ni me-1"
                :class="isValidatingSegments ? 'ni-settings-gear-65' : 'ni-check-bold'"
              ></i>
              {{ isValidatingSegments ? 'Validierung läuft...' : 'Annotation validieren' }}
            </button>
            <button
              v-else-if="!canMutateSelectedSegments"
              type="button"
              class="btn btn-outline-success btn-sm ms-auto validation-edit-button"
              @click="enableSegmentEditing"
            >
              <i class="ni ni-single-copy-04 me-1"></i>
              Segmente bearbeiten
            </button>
          </div>

          <div
            v-else-if="selectedVideoId !== null && isSegmentCleanupPending(selectedVideoId)"
            class="alert alert-info d-flex align-items-center validation-processing-alert"
            data-test="segment-cleanup-processing"
            role="status"
            aria-live="polite"
          >
            <i class="ni ni-settings-gear-65 ni-2x me-3 text-info"></i>
            <div class="validation-status-body">
              <h6 class="mb-1">
                <i class="ni ni-tv-2 me-1"></i>
                Außerhalb-Frames werden geschwärzt
              </h6>
              <small class="text-muted">
                Die Segmentprüfung ist gespeichert. Das Video wird erst als validiert angezeigt,
                wenn die geschwärzten Outside-Frames erzeugt und geprüft wurden.
              </small>
            </div>
          </div>

          <div
            v-else-if="selectedVideoId !== null && isSegmentCleanupFailed(selectedVideoId)"
            class="alert alert-warning d-flex align-items-center validation-failed-alert"
            data-test="segment-cleanup-failed"
            role="alert"
          >
            <i class="ni ni-settings ni-2x me-3 text-warning"></i>
            <div class="validation-status-body">
              <h6 class="mb-1">Nachverarbeitung prüfen</h6>
              <small class="text-muted">
                Die Segmentvalidierung ist noch nicht abgeschlossen, weil die Outside-Frame-Prüfung
                nicht erfolgreich war.
                <span v-if="selectedPostValidationRebuildDetails">
                  {{ selectedPostValidationRebuildDetails }}
                </span>
              </small>
            </div>
          </div>

          <div
            v-if="
              selectedVideoId !== null &&
              !isSegmentCleanupPending(selectedVideoId) &&
              !isAnnotationFinished(selectedVideoId)
            "
            class="d-flex justify-content-center"
          >
            <button
              class="btn validation-action-button d-inline-flex align-items-center justify-content-center gap-2"
              :class="{
                'validation-action-button-clicked': selectedVideoId === validationRequestVideoId
              }"
              @click="handleValidateAndMark(selectedVideoId)"
              :disabled="
                segmentSourceMode === 'prediction' ||
                isValidatingSegments ||
                isSegmentCleanupPending(selectedVideoId)
              "
              :aria-busy="isValidatingSegments ? 'true' : 'false'"
            >
              <!-- Remove mark validated when keeping outside segments for training -->
              <i
                class="ni validation-action-icon"
                :class="isValidatingSegments ? 'ni-settings-gear-65' : 'ni-check-bold'"
              ></i>
              <span>
                {{
                  isValidatingSegments
                    ? 'Validierung läuft...'
                    : selectedVideoId !== null && isSegmentCleanupFailed(selectedVideoId)
                      ? `Validierung erneut starten (${timelineSegmentsForSelectedVideo.length})`
                      : `Alle Segmente validieren (${timelineSegmentsForSelectedVideo.length})`
                }}
              </span>
            </button>
          </div>

          <div class="d-flex justify-content-center mt-2">
            <button
              type="button"
              class="btn btn-outline-dark btn-sm d-inline-flex align-items-center justify-content-center gap-2"
              data-test="blacken-outside-segments-button"
              :disabled="!canBlackenOutsideSegments"
              :aria-busy="isBlackeningOutsideSegments ? 'true' : 'false'"
              @click="blackenOutsideSegmentsForSelectedVideo"
            >
              <i
                class="ni"
                :class="isBlackeningOutsideSegments ? 'ni-settings-gear-65' : 'ni-tv-2'"
              ></i>
              <span>
                {{
                  isBlackeningOutsideSegments
                    ? 'Schwärzung wird gestartet...'
                    : 'Außerhalb-Segmente schwärzen'
                }}
              </span>
            </button>
          </div>

          <p
            v-if="!isAnnotationFinished(selectedVideoId) && segmentSourceMode !== 'prediction'"
            class="text-muted text-center mt-2 mb-0"
            style="font-size: 0.9rem"
          >
            <i class="ni ni-user-run" style="font-size: 16px; vertical-align: middle"></i>
            Markiert alle Segmente als überprüft und startet die Nachverarbeitung: Outside-Frames
            schwärzen und prüfen.
          </p>
        </div>
      </div>

      <!-- Centralized reporting handoff -->
      <div class="col-lg-12">
        <div class="card">
          <div class="card-header pb-0">
            <h5 class="mb-0">
              <i class="ni ni-single-copy-04 me-2"></i>
              Klinische Befundung
            </h5>
            <small class="text-muted" v-if="currentMarker">
              Zeitpunkt: {{ formatTime(currentMarker.timestamp) }}
            </small>
            <div class="mt-2" v-if="selectedVideoId && canAnnotateSelectedVideo">
              <div class="alert alert-info alert-sm mb-0">
                <i class="ni ni-user-run me-1"></i>
                <strong>Video {{ selectedVideoId }}:</strong>
                Die klinische Befundung erfolgt im nächsten Schritt.
              </div>
            </div>
          </div>
          <div class="card-body">
            <div class="text-center text-muted py-5 px-3">
              <i class="ni ni-collection ni-3x mb-3 text-muted"></i>
              <h6>Befundung fortsetzen</h6>
              <p class="mb-3">
                Wechseln Sie zur Befundung, um den Fall weiter zu bearbeiten und den Bericht zu
                vervollständigen.
              </p>
              <p class="small text-muted mb-4">
                Öffnen Sie dort den passenden Patientenfall und führen Sie die Dokumentation weiter.
              </p>
              <RouterLink class="btn btn-primary" to="/reporting/case-setup">
                Zur Befundung wechseln
              </RouterLink>
            </div>
          </div>
        </div>

        <!-- Saved Examinations List -->
        <div class="card mt-3" v-if="savedExaminations.length > 0">
          <div class="card-header pb-0">
            <h6 class="mb-0">Gespeicherte Untersuchungen</h6>
          </div>
          <div class="card-body" data-cy="saved-examinations">
            <div class="list-group list-group-flush">
              <div
                v-for="exam in savedExaminations"
                :key="exam.id"
                class="list-group-item d-flex justify-content-between align-items-center px-0"
              >
                <div>
                  <small class="text-muted">{{ formatTime(exam.timestamp) }}</small>
                  <div>{{ exam.examination_type || 'Untersuchung' }}</div>
                </div>
                <div>
                  <button
                    @click="jumpToExamination(exam)"
                    class="btn btn-sm btn-outline-primary me-2"
                  >
                    <i class="ni ni-button-play"></i>
                  </button>
                  <button @click="deleteExamination(exam.id)" class="btn btn-sm btn-outline-danger">
                    <i class="ni ni-settings-gear-65"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  useVideoStore,
  type PredictionModelMeta,
  type Segment,
  type SegmentAnnotationStatus,
  type SegmentSourceKind,
  type Video
} from '@/stores/videoStore'
import { useAnonymizationStore } from '@/stores/anonymizationStore'
import { useMediaTypeStore } from '@/stores/mediaTypeStore'
import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'
import Timeline from '@/components/VideoExamination/Timeline.vue'
import { storeToRefs } from 'pinia'
import { useToastStore } from '@/stores/toastStore'
import { formatTime, getTranslationForLabel, getColorForLabel } from '@/utils/videoUtils'
import { buildVideoStreamUrl } from '@/utils/mediaUrls'
import { useRoute, useRouter } from 'vue-router'
import { useAuthKcStore } from '@/stores/auth_kc'
import {
  clearAnnotatorOverride,
  getAnnotatorPrincipalFromAuthUser,
  loadAnnotatorOverride,
  saveAnnotatorOverride
} from '@/utils/annotationPrincipal'

const route = useRoute() // ①
const router = useRouter()
// ------------------------------------------------------------------
// pick the number once when the view is created
// ------------------------------------------------------------------
const initialVideoId = Number(route.query.video ?? '') || null

interface ExaminationMarker {
  id: string
  timestamp: number
  examination_data?: any
}

interface SavedExamination {
  id: number
  timestamp: number
  examination_type?: string
  data?: any
}

interface SegmentResizeEvent {
  segmentId: number
  newStart: number
  newEnd: number
}

interface CreateSegmentEvent {
  label: string
  start: number
  end: number
}

interface VideoSensitiveMeta {
  patientDob?: string | null
  patient_dob?: string | null
  patientGenderName?: string | null
  patient_gender_name?: string | null
}

type MessageTone = 'hint' | 'danger'
type VideoDropdownStatus =
  | 'not_usable'
  | 'pending_anonymization_validation'
  | 'ready_for_annotation'
  | 'annotation_cleanup_pending'
  | 'annotation_cleanup_failed'
  | 'annotation_validated'
type VideoDropdownFilter = 'all' | 'usable' | VideoDropdownStatus

// Store setup
const videoStore = useVideoStore()
const mediaStore = useMediaTypeStore()
const authStore = useAuthKcStore()
const videoStoreRefs = storeToRefs(videoStore)

const { videoList, videoStreamUrl, timelineSegments } = videoStoreRefs
const predictionModels = videoStoreRefs.predictionModels ?? ref<PredictionModelMeta[]>([])
const defaultHuggingfaceModelId = videoStoreRefs.defaultHuggingfaceModelId ?? ref('')
const defaultPredictionLabelsetName = videoStoreRefs.defaultPredictionLabelsetName ?? ref('')

const videos = computed(() => videoList.value.videos)

const { allSegments: rawSegments } = storeToRefs(videoStore)

const anonymizationStore = useAnonymizationStore()

const { overview } = storeToRefs(anonymizationStore)

// Use spread operator to convert readonly array to mutable array
const timelineLabels = computed(() => {
  const storeLabels = videoStore.labels || []
  return [...storeLabels] // Convert readonly array to mutable array
})

function getVideoOverviewItem(videoId: number) {
  return overview.value.find((o) => o.id === videoId && o.mediaType === 'video')
}

function getVideoAnonymizationStatus(videoId: number): string {
  return getVideoOverviewItem(videoId)?.anonymizationStatus || 'unknown'
}

function canViewProcessedVideo(videoId: number): boolean {
  const item = getVideoOverviewItem(videoId)
  return (
    item?.anonymizationStatus === 'done_processing_anonymization' ||
    item?.anonymizationStatus === 'validated'
  )
}

function canAnnotateSegments(videoId: number): boolean {
  return (
    getVideoOverviewItem(videoId)?.anonymizationStatus === 'validated' ||
    isAnnotationFinished(videoId)
  )
}

function isAnnotationFinished(videoId: number): boolean {
  const video = videoList.value.videos.find((v) => v.id === videoId)
  return Boolean(video?.segmentAnnotationsValidated)
}

function getVideoSegmentAnnotationStatus(videoId: number): SegmentAnnotationStatus {
  const video = videoList.value.videos.find((v) => v.id === videoId)
  if (video?.segmentAnnotationStatus) return video.segmentAnnotationStatus
  return video?.segmentAnnotationsValidated ? 'validated' : 'not_started'
}

function isSegmentCleanupPending(videoId: number): boolean {
  const status = getVideoSegmentAnnotationStatus(videoId)
  return status === 'cleanup_queued' || status === 'cleanup_running'
}

function isSegmentCleanupFailed(videoId: number): boolean {
  const status = getVideoSegmentAnnotationStatus(videoId)
  return status === 'cleanup_failed' || status === 'cleanup_required'
}

// Reactive data
const selectedVideoId = ref<number | null>(initialVideoId)
const currentTime = ref<number>(0)
const duration = ref<number>(0)
const fps = computed<number>(() => videoStore.effectiveFps)
const isPlaying = ref<boolean>(false) // ✅ NEW: Track video playing state
const examinationMarkers = ref<ExaminationMarker[]>([])
const savedExaminations = ref<SavedExamination[]>([])
const currentMarker = ref<ExaminationMarker | null>(null)
const selectedLabelType = ref<string>('')
const isLabelSelectActive = ref<boolean>(false)
const isMarkingLabel = ref<boolean>(false)
const labelMarkingStart = ref<number>(0)
const selectedSegmentId = ref<number | null>(null)
const isInitialLoading = ref<boolean>(true)
const lastValidationClickedVideoId = ref<number | null>(null)
const validationRequestVideoId = ref<number | null>(null)
const segmentSourceMode = ref<SegmentSourceKind>('manual')
const isImportingPredictionSegments = ref<boolean>(false)
const predictionModelMode = ref<'local' | 'huggingface'>('local')
const selectedPredictionModelMetaId = ref<number | null>(null)
const huggingFaceModelId = ref<string>('')
const isRerunningPredictionSegments = ref<boolean>(false)
const annotatorOverride = ref<string | null>(null)
const annotatorOverrideInput = ref<string>('')

// Video detail and metadata like VideoClassificationComponent
const videoDetail = ref<Record<string, never> | null>(null)
const videoMeta = ref<{ duration: number } | null>(null)

// Error and success messages for Bootstrap alerts
const errorMessage = ref<string>('')
const messageTone = ref<MessageTone>('hint')
const successMessage = ref<string>('')
const isFullscreen = ref<boolean>(false)
const isValidatingSegments = computed(() => validationRequestVideoId.value !== null)
const outsideBlackeningRequestVideoIds = ref<Set<number>>(new Set())
const isBlackeningOutsideSegments = computed(
  () =>
    selectedVideoId.value !== null &&
    outsideBlackeningRequestVideoIds.value.has(selectedVideoId.value)
)
const activeValidationIndicatorVideoId = computed(
  () => validationRequestVideoId.value ?? lastValidationClickedVideoId.value
)

// Template refs
const videoRef = ref<HTMLVideoElement | null>(null)
const videoContainerRef = ref<HTMLElement | null>(null)
const labelSelectRef = ref<HTMLSelectElement | null>(null)
const timelineRef = ref<HTMLElement | null>(null)
const videoDropdownRef = ref<HTMLElement | null>(null)
const isVideoDropdownOpen = ref<boolean>(false)
const videoDropdownSearch = ref<string>('')
const videoDropdownFilter = ref<VideoDropdownFilter>('all')
const videoSensitiveMetaMap = ref<Record<number, VideoSensitiveMeta>>({})
// Video Dropdown Watcher

const hasUnsavedChanges = computed(() =>
  rawSegments.value.some(
    (s) =>
      s.isDirty &&
      s.videoID === selectedVideoId.value &&
      (segmentSourceMode.value === 'all' || s.segmentOrigin === segmentSourceMode.value)
  )
)

async function loadSelectedVideo() {
  if (selectedVideoId.value == null) {
    videoStore.clearVideo()
    videoDetail.value = null
    videoMeta.value = null
    return
  }

  if (!canViewProcessedVideo(selectedVideoId.value)) {
    videoStore.clearVideo()
    videoDetail.value = null
    videoMeta.value = null
    duration.value = 0
    savedExaminations.value = []
    examinationMarkers.value = []
    currentMarker.value = null
    selectedSegmentId.value = null
    showErrorMessage(
      `Video ${selectedVideoId.value} kann noch nicht in der Segmentansicht geöffnet werden. Status: ${getStatusText(
        getVideoAnonymizationStatus(selectedVideoId.value)
      )}.`
    )
    return
  }
  // Clear previous error messages when changing videos
  clearErrorMessage()
  clearSuccessMessage()

  try {
    await videoStore.loadVideo(selectedVideoId.value)
    await loadVideoDetail(selectedVideoId.value)
    await guarded(loadSavedExaminations())
    await guarded(loadVideoMetadata())

    console.log('Video fully loaded:', selectedVideoId.value)
  } catch (err: any) {
    console.error('loadSelectedVideo failed', err)
    await guarded(Promise.reject(err))
  }
}

function onVideoChange() {
  // handler for the <select>
  /** update the url so users can bookmark / refresh */
  router.replace({ query: { video: selectedVideoId.value } })
}

function toggleVideoDropdown(): void {
  if (!hasVideos.value) return
  isVideoDropdownOpen.value = !isVideoDropdownOpen.value
  if (isVideoDropdownOpen.value) {
    loadSensitiveMetaForVideos(videos.value.map((v) => v.id))
  }
}

function closeVideoDropdown(): void {
  isVideoDropdownOpen.value = false
  videoDropdownSearch.value = ''
}

function selectVideoFromDropdown(videoId: number): void {
  const selected = videos.value.find((video) => video.id === videoId)
  if (!selected) return
  selectedVideoId.value = videoId
  onVideoChange()
  closeVideoDropdown()
}

function enableSegmentEditing(): void {
  if (selectedVideoId.value === null) return

  router.push({
    query: {
      ...route.query,
      video: String(selectedVideoId.value),
      editSegments: '1'
    }
  })
}

const handleDocumentClick = (event: MouseEvent): void => {
  const target = event.target
  if (!(target instanceof Node)) return
  if (!videoDropdownRef.value) return
  if (!videoDropdownRef.value.contains(target)) {
    closeVideoDropdown()
  }
}

const parseDobToDate = (rawDob: string | null | undefined): Date | null => {
  if (!rawDob) return null
  const trimmed = rawDob.trim()
  if (!trimmed) return null

  const isoCandidate = new Date(trimmed)
  if (!Number.isNaN(isoCandidate.getTime())) return isoCandidate

  const deMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (deMatch) {
    const [, day, month, year] = deMatch
    const parsed = new Date(Number(year), Number(month) - 1, Number(day))
    if (!Number.isNaN(parsed.getTime())) return parsed
  }

  return null
}

const getAgeFromDob = (rawDob: string | null | undefined): number | null => {
  const dob = parseDobToDate(rawDob)
  if (!dob) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDelta = today.getMonth() - dob.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) {
    age -= 1
  }
  return age >= 0 ? age : null
}

const normalizeGenderLabel = (value: string | null | undefined): string => {
  if (!value) return 'Unbekannt'
  const normalized = value.toLowerCase()
  if (normalized === 'male' || normalized === 'männlich') return 'Männlich'
  if (normalized === 'female' || normalized === 'weiblich') return 'Weiblich'
  if (normalized === 'diverse') return 'Divers'
  return value
}

const getVideoPatientGender = (videoId: number): string => {
  return normalizeGenderLabel(videoSensitiveMetaMap.value[videoId]?.patient_gender_name)
}

const getVideoPatientAgeLabel = (videoId: number): string => {
  const age = getAgeFromDob(videoSensitiveMetaMap.value[videoId]?.patient_dob)
  return age == null ? 'Unbekannt' : `${age} J.`
}

const loadSensitiveMetaForVideos = async (videoIds: number[]): Promise<void> => {
  const missingIds = videoIds.filter((id) => !(id in videoSensitiveMetaMap.value))
  if (missingIds.length === 0) return

  const results = await Promise.all(
    missingIds.map(async (id) => {
      try {
        const { data } = await axiosInstance.get<VideoSensitiveMeta>(
          r(`media/videos/${id}/sensitive-metadata/`)
        )
        return { id, data }
      } catch {
        return { id, data: { patient_dob: null, patient_gender_name: null } as VideoSensitiveMeta }
      }
    })
  )

  const nextMap = { ...videoSensitiveMetaMap.value }
  results.forEach(({ id, data }) => {
    nextMap[id] = {
      patient_dob: data?.patientDob ?? data?.patient_dob ?? null,
      patient_gender_name: data?.patientGenderName ?? data?.patient_gender_name ?? null
    }
  })
  videoSensitiveMetaMap.value = nextMap
}

const selectableVideos = computed(() => videoList.value.videos)

const usableVideos = computed(() => videos.value.filter((v) => canViewProcessedVideo(v.id)))

const filteredSelectableVideos = computed(() => {
  const query = videoDropdownSearch.value.trim().toLowerCase()
  const statusFilteredVideos = selectableVideos.value.filter((video) =>
    isVideoVisibleForDropdownFilter(video.id)
  )
  if (!query) return statusFilteredVideos

  return statusFilteredVideos.filter((video) => {
    const searchable = [
      String(video.id),
      video.original_file_name,
      video.centerName,
      video.centerKey,
      getVideoPatientGender(video.id),
      getVideoPatientAgeLabel(video.id),
      getVideoValidatedAnnotatorLabel(video.id),
      getVideoDropdownStatusText(video.id)
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return searchable.includes(query)
  })
})

const annotatableVideos = computed(() =>
  usableVideos.value.filter((v) => !isAnnotationFinished(v.id))
)

const pendingValidationVideos = computed(() =>
  usableVideos.value.filter((v) => !v.segmentAnnotationsValidated)
)

const selectedVideo = computed<Video | undefined>(() => {
  if (selectedVideoId.value == null) return undefined
  return selectableVideos.value.find((v) => v.id === selectedVideoId.value)
})

const isSelectedVideoValidated = computed(
  () => selectedVideoId.value != null && isAnnotationFinished(selectedVideoId.value)
)
const isSelectedVideoViewable = computed(
  () => selectedVideoId.value != null && canViewProcessedVideo(selectedVideoId.value)
)
const canAnnotateSelectedVideo = computed(
  () => selectedVideoId.value != null && canAnnotateSegments(selectedVideoId.value)
)
const selectedPostValidationRebuildDetails = computed(() => {
  const details = selectedVideo.value?.postValidationRebuild?.details
  return typeof details === 'string' && details.trim() ? details.trim() : ''
})
const canBlackenOutsideSegments = computed(
  () =>
    selectedVideoId.value !== null &&
    canAnnotateSelectedVideo.value &&
    !isSegmentCleanupPending(selectedVideoId.value) &&
    !outsideBlackeningRequestVideoIds.value.has(selectedVideoId.value)
)

const videoDropdownFilterOptions = computed<Array<{ value: VideoDropdownFilter; label: string }>>(
  () => [
    { value: 'all', label: `Alle (${videos.value.length})` },
    { value: 'usable', label: `Nutzbar (${usableVideos.value.length})` },
    {
      value: 'pending_anonymization_validation',
      label: `Anonymisierung prüfen (${getVideoCountByDropdownStatus(
        'pending_anonymization_validation'
      )})`
    },
    {
      value: 'ready_for_annotation',
      label: `Bereit (${getVideoCountByDropdownStatus('ready_for_annotation')})`
    },
    {
      value: 'annotation_cleanup_pending',
      label: `Validierung läuft (${getVideoCountByDropdownStatus('annotation_cleanup_pending')})`
    },
    {
      value: 'annotation_cleanup_failed',
      label: `Validierung prüfen (${getVideoCountByDropdownStatus('annotation_cleanup_failed')})`
    },
    {
      value: 'annotation_validated',
      label: `Segmentvalidiert (${getVideoCountByDropdownStatus('annotation_validated')})`
    },
    {
      value: 'not_usable',
      label: `Nicht nutzbar (${getVideoCountByDropdownStatus('not_usable')})`
    }
  ]
)

function isVideoVisibleForDropdownFilter(videoId: number): boolean {
  const activeFilter = videoDropdownFilter.value
  if (activeFilter === 'all') return true
  if (activeFilter === 'usable') return canViewProcessedVideo(videoId)
  return getVideoDropdownStatus(videoId) === activeFilter
}

const isSegmentEditingUnlocked = computed(() => route.query.editSegments === '1')

const baseAnnotatorPrincipal = computed(() =>
  getAnnotatorPrincipalFromAuthUser(authStore.user as Record<string, unknown> | null)
)
const annotatorOverrideScope = computed(() =>
  selectedVideoId.value == null ? 'video:none' : `video:${selectedVideoId.value}`
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

function getVideoValidatedAnnotators(videoId: number): string[] {
  const video = selectableVideos.value.find((v) => v.id === videoId)
  const annotators = video?.validatedAnnotators ?? []
  return [...new Set(annotators.map((annotator) => String(annotator).trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b)
  )
}

function hasOtherValidatedAnnotator(videoId: number): boolean {
  return getVideoValidatedAnnotators(videoId).some(
    (annotator) => annotator !== activeAnnotatorPrincipal.value
  )
}

function getVideoValidatedAnnotatorLabel(videoId: number): string {
  const annotators = getVideoValidatedAnnotators(videoId)
  if (!annotators.length) return ''

  const prefix = hasOtherValidatedAnnotator(videoId) ? 'Vorannotation von' : 'Validiert von'
  return `${prefix}: ${annotators.join(', ')}`
}

const isSegmentReadOnlyByValidation = computed(() => isSelectedVideoValidated.value)
const hasSegmentEditOverride = computed(
  () => isSegmentEditingUnlocked.value || isAnnotatorOverrideActive.value
)
const canMutateSelectedSegments = computed(
  () =>
    canAnnotateSelectedVideo.value &&
    (selectedVideoId.value === null || !isSegmentCleanupPending(selectedVideoId.value)) &&
    (!isSegmentReadOnlyByValidation.value || hasSegmentEditOverride.value)
)

type ReadonlyPredictionModelMeta = Readonly<PredictionModelMeta>

const predictionModelOptions = computed<readonly ReadonlyPredictionModelMeta[]>(
  () => predictionModels.value ?? []
)

const selectedPredictionModel = computed<ReadonlyPredictionModelMeta | null>(
  () =>
    predictionModelOptions.value.find(
      (model) => model.id === selectedPredictionModelMetaId.value
    ) ?? null
)

const canRerunPredictionSegments = computed(() => {
  if (
    selectedVideoId.value === null ||
    isRerunningPredictionSegments.value ||
    !canMutateSelectedSegments.value
  ) {
    return false
  }
  if (predictionModelMode.value === 'huggingface') {
    return huggingFaceModelId.value.trim().length > 0
  }
  return selectedPredictionModel.value !== null
})

function formatPredictionModelOption(model: ReadonlyPredictionModelMeta): string {
  const activeSuffix = model.isActive ? ' · aktiv' : ''
  return `${model.modelName} / ${model.name} v${model.version}${activeSuffix}`
}

const selectedVideoLabel = computed(() => {
  if (!selectableVideos.value.length) return 'Keine Videos verfügbar'
  if (selectedVideoId.value == null) return 'Bitte Video auswählen...'
  const video = selectableVideos.value.find((v) => v.id === selectedVideoId.value)
  if (!video) return `Video ${selectedVideoId.value}`
  return video.original_file_name || `Video Nr. ${video.id}`
})

watch(
  videos,
  (videos) => {
    if (!videos.length) return
    loadSensitiveMetaForVideos(videos.map((v) => v.id))
  },
  { immediate: true }
)

watch(
  predictionModelOptions,
  (models) => {
    if (selectedPredictionModelMetaId.value !== null || models.length === 0) return
    const activeModel = models.find((model) => model.isActive)
    selectedPredictionModelMetaId.value = activeModel?.id ?? models[0].id
  },
  { immediate: true }
)

watch(
  defaultHuggingfaceModelId,
  (modelId) => {
    if (!huggingFaceModelId.value.trim()) {
      huggingFaceModelId.value = modelId
    }
  },
  { immediate: true }
)

function syncAnnotatorOverrideFromStorage(): void {
  annotatorOverride.value = loadAnnotatorOverride(
    annotatorOverrideScope.value,
    baseAnnotatorPrincipal.value
  )
  annotatorOverrideInput.value = annotatorOverride.value ?? ''
}

function restartVideoAnnotationAsOverride(): void {
  const normalized = annotatorOverrideInput.value.trim()
  if (!normalized) return
  saveAnnotatorOverride(annotatorOverrideScope.value, baseAnnotatorPrincipal.value, normalized)
  annotatorOverride.value = normalized
  clearErrorMessage()
  clearSuccessMessage()
}

function revertVideoAnnotatorOverride(): void {
  clearAnnotatorOverride(annotatorOverrideScope.value, baseAnnotatorPrincipal.value)
  annotatorOverride.value = null
  annotatorOverrideInput.value = ''
}

watch(
  [baseAnnotatorPrincipal, annotatorOverrideScope],
  () => {
    syncAnnotatorOverrideFromStorage()
  },
  { immediate: true }
)

// Video streaming URL using MediaStore logic like AnonymizationValidationComponent
const anonymizedVideoSrc = computed(() => {
  if (!selectedVideoId.value) return undefined
  if (!canViewProcessedVideo(selectedVideoId.value)) return undefined
  return buildVideoStreamUrl(selectedVideoId.value, 'processed')
})

const hasVideos = computed(() => {
  return videos.value.length > 0
})

const noVideosMessage = computed(() => {
  if (videos.value.length === 0) {
    return 'Keine Videos verfügbar. Bitte laden Sie zuerst Videos hoch.'
  }
  return ''
})

const timelineSegmentsForSelectedVideo = computed<Segment[]>(() => {
  if (!selectedVideoId.value) return []

  return rawSegments.value.filter((s) => s.videoID === selectedVideoId.value)
})

const canStartLabeling = computed(() => {
  return (
    selectedVideoId.value &&
    anonymizedVideoSrc.value &&
    selectedLabelType.value &&
    !isMarkingLabel.value &&
    duration.value > 0 &&
    canMutateSelectedSegments.value
  )
})

// ✅ PRIORITY: Load labels first, then videos, then anonymization status
onMounted(async () => {
  console.log('🚀 [VideoExamination] Component mounted - loading data in priority order...')
  isInitialLoading.value = true
  try {
    // Step 1: Load labels with high priority
    await videoStore.fetchLabels()
    console.log(`✅ [VideoExamination] Labels loaded: ${videoStore.labels.length}`)

    try {
      if (typeof videoStore.fetchPredictionModels === 'function') {
        await videoStore.fetchPredictionModels()
      }
    } catch (error) {
      console.warn('[VideoExamination] Prediction model list could not be loaded:', error)
    }

    // Step 2: Load anonymization overview BEFORE videos (needed for filtering)
    await anonymizationStore.fetchOverview()
    console.log(`✅ [VideoExamination] Anonymization status loaded: ${overview.value.length} items`)

    // Step 3: Load videos after labels and anonymization status are available
    await videoStore.fetchAllVideos()
    pollExistingSegmentCleanupVideos()
    console.log(`✅ [VideoExamination] Videos loaded: ${videoStore.videoList.videos.length}`)
    console.log(`✅ [VideoExamination] Annotatable videos: ${annotatableVideos.value.length}`)

    if (selectedVideoId.value !== null) {
      videoStore.setCurrentVideo(selectedVideoId.value)
      await loadSelectedVideo()
      if (canViewProcessedVideo(selectedVideoId.value)) {
        await loadVideoSegments()
      }
    }
  } catch (error) {
    console.error('❌ [VideoExamination] Error during initial load:', error)
    showErrorMessage('Fehler beim Laden der Daten. Bitte Seite neu laden.')
  } finally {
    isInitialLoading.value = false
  }

  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})

// Guarded function for error handling like VideoClassificationComponent
function isAbortLikeError(error: any): boolean {
  const message = String(
    error?.message || error?.target?.error?.message || error || ''
  ).toLowerCase()
  const code = error?.code || error?.target?.error?.code
  const mediaAbortCode = typeof MediaError !== 'undefined' ? MediaError.MEDIA_ERR_ABORTED : 1

  return (
    code === 20 ||
    code === mediaAbortCode ||
    error?.name === 'AbortError' ||
    error?.code === 'ERR_CANCELED' ||
    message.includes('ns_binding_aborted') ||
    message.includes('binding aborted') ||
    message.includes('aborted') ||
    message.includes('canceled') ||
    message.includes('cancelled')
  )
}

async function guarded<T>(p: Promise<T>): Promise<T | undefined> {
  try {
    return await p
  } catch (e: any) {
    if (isAbortLikeError(e)) {
      console.debug('[VideoExamination] Ignoring aborted request/media load:', e)
      return undefined
    }
    const errorMsg =
      e?.response?.data?.detail || e?.response?.data?.error || e?.message || String(e)
    showErrorMessage(errorMsg)
    return undefined
  }
}

watch(videoStreamUrl, (newUrl) => {
  console.log('Video stream URL updated:', newUrl)
})

// Alert management methods
const clearErrorMessage = (): void => {
  errorMessage.value = ''
  messageTone.value = 'hint'
}

const clearSuccessMessage = (): void => {
  successMessage.value = ''
}

const showSuccessMessage = (message: string): void => {
  successMessage.value = message
  // Auto-clear after 5 seconds
  setTimeout(() => {
    clearSuccessMessage()
  }, 5000)
}

const showErrorMessage = (message: string, tone: MessageTone = 'hint'): void => {
  errorMessage.value = message
  messageTone.value = tone
}

function getSegmentMutationBlockedMessage(): string {
  if (selectedVideoId.value !== null && !canAnnotateSegments(selectedVideoId.value)) {
    return 'Segmentbearbeitung ist erst nach validierter Anonymisierung möglich.'
  }
  return 'Dieses Video ist bereits validiert und wird schreibgeschützt angezeigt.'
}

// Load video detail from backend like VideoClassificationComponent
const loadVideoDetail = async (videoId: number): Promise<void> => {
  if (!videoId) return

  try {
    console.log('Loading video detail for ID:', videoId)
    const response = await axiosInstance.get(r(endpoints.media.videoDetail(videoId)))
    console.log('Video detail response:', response.data)

    videoDetail.value = {}
    videoMeta.value = {
      duration: Number(response.data.duration ?? 0)
    }

    // Update MediaStore with the current video for consistent URL handling
    const currentVideo = selectableVideos.value.find((v) => v.id === videoId)
    if (currentVideo) {
      mediaStore.rememberType(videoId, 'video', 'video')
      mediaStore.setCurrentItem({
        ...(currentVideo as any),
        id: videoId,
        scope: 'video',
        mediaType: 'video',
        filename: currentVideo.original_file_name,
        processedStreamUrl: buildVideoStreamUrl(videoId, 'processed')
      })
      console.log('MediaStore updated with video:', videoId)
    }

    // Update local duration if available
    if (videoMeta.value.duration > 0) {
      duration.value = videoMeta.value.duration
    }

    console.log('Video meta loaded:', videoMeta.value)
    console.log('Stream source will be:', anonymizedVideoSrc.value)
  } catch (error) {
    console.error('Error loading video detail:', error)
    await guarded(Promise.reject(error))
  }
}

const loadSavedExaminations = async (): Promise<void> => {
  if (selectedVideoId.value === null) return

  try {
    // TODO: Migrate to new media framework URL when backend supports /api/media/videos/{id}/examinations/
    // Currently using old URL as part of partial migration strategy
    const response = await axiosInstance.get(r(`video/${selectedVideoId.value}/examinations/`))
    savedExaminations.value = response.data

    // Create markers for saved examinations
    examinationMarkers.value = response.data.map(
      (exam: SavedExamination): ExaminationMarker => ({
        id: `exam-${exam.id}`,
        timestamp: exam.timestamp,
        examination_data: exam.data
      })
    )
  } catch (error: any) {
    console.error('Error loading saved examinations:', error)

    // Check if this is an anonymization error like VideoClassificationComponent
    const errorMessage =
      error?.response?.data?.error ||
      error?.response?.data?.detail ||
      error?.message ||
      error.toString()
    if (
      errorMessage.includes('darf nicht annotiert werden') ||
      errorMessage.includes('anonymisierung') ||
      errorMessage.includes('anonymization')
    ) {
      showErrorMessage(
        `Video ${selectedVideoId.value} darf nicht annotiert werden, solange die Anonymisierung nicht abgeschlossen ist.`
      )
    } else if (error?.response?.status !== 404) {
      await guarded(Promise.reject(error))
    }

    savedExaminations.value = []
    examinationMarkers.value = []
  }
}

const loadVideoMetadata = async (): Promise<void> => {
  if (videoRef.value) {
    await new Promise<void>((resolve) => {
      const video = videoRef.value!
      if (video.readyState >= 1) {
        duration.value = video.duration
        resolve()
      } else {
        video.addEventListener(
          'loadedmetadata',
          () => {
            duration.value = video.duration
            resolve()
          },
          { once: true }
        )
      }
    })
  }
}

async function loadVideoSegments(): Promise<void> {
  if (selectedVideoId.value === null) return
  if (!canViewProcessedVideo(selectedVideoId.value)) return

  try {
    await videoStore.fetchAllSegments(selectedVideoId.value, true, {
      sourceKind: segmentSourceMode.value
    })
    console.log('Video segments loaded for video:', selectedVideoId.value)
    console.log('Timeline segments count:', rawSegments.value.length)
  } catch (error) {
    console.error('Error loading video segments:', error)
  }
}

const handleSegmentSourceChange = async (): Promise<void> => {
  selectedSegmentId.value = null
  await loadVideoSegments()
}

const onVideoLoaded = (): void => {
  if (videoRef.value) {
    duration.value = videoRef.value.duration

    // ✅ NEW: Add play/pause event listeners for state tracking
    videoRef.value.addEventListener('play', () => {
      isPlaying.value = true
    })

    videoRef.value.addEventListener('pause', () => {
      isPlaying.value = false
    })

    videoRef.value.addEventListener('ended', () => {
      isPlaying.value = false
    })

    console.log('🎥 Video loaded - Frontend')
    console.log(`- Video source URL: ${anonymizedVideoSrc.value}`)
    console.log(`- Legacy stream URL: ${videoStreamUrl.value}`)
    console.log(`- Video readyState: ${videoRef.value.readyState}`)
    console.log(`- Video networkState: ${videoRef.value.networkState}`)

    if (videoRef.value.videoWidth && videoRef.value.videoHeight) {
      console.log(`- Video dimensions: ${videoRef.value.videoWidth}x${videoRef.value.videoHeight}`)
    }

    if (duration.value < 10) {
      console.warn(`⚠️ WARNING: Video duration seems very short (${duration.value}s)`)
    } else {
      showSuccessMessage(`Video geladen: ${Math.round(duration.value)}s Dauer`)
    }
  }
}

const handleTimeUpdate = (): void => {
  if (videoRef.value) {
    currentTime.value = videoRef.value.currentTime
  }
}

const handleTimelineClick = (event: MouseEvent): void => {
  if (!timelineRef.value || duration.value === 0) return

  const rect = timelineRef.value.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const percentage = clickX / rect.width
  const newTime = percentage * duration.value

  seekToTime(newTime)
}

// TS2322-safe event handlers like VideoClassificationComponent
const handleTimelineSeek = (...args: unknown[]): void => {
  const [time] = args as [number]
  seekToTime(time)
}

// Play/pause handler for Timeline
const handlePlayPause = (...args: unknown[]): void => {
  if (!videoRef.value) return

  if (videoRef.value.paused) {
    videoRef.value.play().catch((error) => {
      console.error('Error playing video:', error)
      showErrorMessage('Fehler beim Abspielen des Videos')
    })
  } else {
    videoRef.value.pause()
  }
}

// Segment selection handler - detects click on segment and sets it for the timeline
const handleSegmentSelect = (...args: unknown[]): void => {
  const [segmentId] = args as [number]
  selectedSegmentId.value = segmentId
  console.log('Segment selected:', segmentId)
}

const handleSegmentLabelChange = (...args: unknown[]): void => {
  if (!canMutateSelectedSegments.value) return

  const [segmentId, label, labelId] = args as [number, string, number | null]
  if (!Number.isFinite(segmentId) || !label) {
    console.warn('[VideoExamination] Invalid segment label change:', args)
    return
  }

  selectedLabelType.value = label

  if (segmentId < 0) {
    videoStore.patchDraftSegment(segmentId, { label })
  } else {
    videoStore.patchSegmentLocally(segmentId, {
      label,
      labelID: labelId
    })
  }
}

const handleSegmentResize = (...args: unknown[]): void => {
  if (!canMutateSelectedSegments.value) return

  const [segmentId, newStart, newEnd, _mode, _final] = args as [
    number,
    number,
    number,
    string,
    boolean?
  ]

  if (!Number.isFinite(segmentId)) {
    console.warn('[VideoExamination] Invalid segment ID for resize:', segmentId)
    return
  }

  if (segmentId < 0) {
    // Draft segment: keep it purely frontend
    videoStore.patchDraftSegment(segmentId, {
      startTime: newStart,
      endTime: newEnd
    })
    videoStore.commitDraft()
  } else {
    // Existing segment: patch locally and mark isDirty
    videoStore.patchSegmentLocally(segmentId, {
      startTime: newStart,
      endTime: newEnd
    })
  }

  // ❌ Absolutely no backend call here, this should use the drafts because of the load on the backend.
}

const handleSegmentMove = (...args: unknown[]): void => {
  if (!canMutateSelectedSegments.value) return

  const [segmentId, newStart, newEnd, _final] = args as [number, number, number, boolean?]

  if (!Number.isFinite(segmentId)) {
    console.warn('[VideoExamination] Invalid segment ID for move:', segmentId)
    return
  }

  if (segmentId < 0) {
    videoStore.patchDraftSegment(segmentId, {
      startTime: newStart,
      endTime: newEnd
    })
  } else {
    videoStore.patchSegmentLocally(segmentId, {
      startTime: newStart,
      endTime: newEnd
    })
  }
}

const handleTimeSelection = (...args: unknown[]): void => {
  if (!canMutateSelectedSegments.value) return

  const [data] = args as [{ start: number; end: number }]

  // ✅ FIXED: Only create segment if we have a selected label type
  if (selectedLabelType.value && selectedVideoId.value) {
    console.log(
      `Creating segment from time selection: ${formatTime(data.start)} - ${formatTime(data.end)} with label: ${selectedLabelType.value}`
    )

    handleCreateSegment({
      label: selectedLabelType.value,
      start: data.start,
      end: data.end
    })
  } else {
    console.warn('Cannot create segment: no label selected or no video selected')
    showErrorMessage('Bitte wählen Sie ein Label aus, bevor Sie ein Segment erstellen.')
  }
}

const handleCreateSegment = (...args: unknown[]): Promise<void> => {
  const [event] = args as [CreateSegmentEvent]
  return new Promise<void>(async (resolve, reject) => {
    try {
      if (!canMutateSelectedSegments.value) {
        showErrorMessage(getSegmentMutationBlockedMessage())
        resolve()
        return
      }
      if (segmentSourceMode.value === 'prediction') {
        showErrorMessage(
          'Neue Segmente bitte erst nach dem Übernehmen in die manuellen Annotationen anlegen.'
        )
        resolve()
        return
      }
      if (selectedVideoId.value) {
        await videoStore.createSegment?.(selectedVideoId.value, event.label, event.start, event.end)
        showSuccessMessage(`Segment erstellt: ${getTranslationForLabel(event.label)}`)
      }
      resolve()
    } catch (error: any) {
      await guarded(Promise.reject(error))
      reject(error)
    }
  })
}

const handleSegmentDelete = (...args: unknown[]): Promise<void> => {
  const [segment] = args as [Segment]
  return new Promise<void>(async (resolve, reject) => {
    if (!canMutateSelectedSegments.value) {
      showErrorMessage(getSegmentMutationBlockedMessage())
      resolve()
      return
    }

    if (!segment.id || typeof segment.id !== 'number') {
      console.warn('Cannot delete draft or temporary segment:', segment.id)
      resolve()
      return
    }

    try {
      if (segmentSourceMode.value === 'prediction') {
        videoStore.removeSegment(segment.id)
        showSuccessMessage(`KI-Segment lokal entfernt: ${getTranslationForLabel(segment.label)}`)
        resolve()
        return
      }

      const deleted = await videoStore.deleteSegment(segment.id)
      if (!deleted) {
        showErrorMessage(
          videoStore.errorMessage || 'Segment konnte nicht gelöscht werden.',
          'danger'
        )
        resolve()
        return
      }

      showSuccessMessage(`Segment gelöscht: ${getTranslationForLabel(segment.label)}`)
      resolve()
    } catch (err: any) {
      console.error('Segment konnte nicht gelöscht werden:', err)
      const errorMsg =
        err?.response?.data?.detail || err?.response?.data?.error || err?.message || String(err)
      showErrorMessage(errorMsg, 'danger')
      reject(err)
    }
  })
}

const seekToTime = (time: number): void => {
  if (videoRef.value && time >= 0 && time <= duration.value) {
    videoRef.value.currentTime = time
    currentTime.value = time
  }
}

const onLabelSelect = (): void => {
  console.log('Label selected:', selectedLabelType.value)
}

const handleFullscreenChange = (): void => {
  isFullscreen.value = document.fullscreenElement === videoContainerRef.value
}

const toggleFullscreen = async (): Promise<void> => {
  const container = videoContainerRef.value
  if (!container) return

  try {
    if (document.fullscreenElement === container) {
      await document.exitFullscreen()
    } else {
      await container.requestFullscreen()
    }
  } catch (error) {
    console.error('Fullscreen toggle failed:', error)
  }
}

const closeLabelOverlay = (): void => {
  isLabelSelectActive.value = false
  labelSelectRef.value?.blur()
}

const selectLabelFromOverlay = (labelName: string): void => {
  selectedLabelType.value = labelName
  closeLabelOverlay()
}

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target instanceof HTMLSelectElement && isLabelSelectActive.value) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

const handleKeyDown = (event: KeyboardEvent): void => {
  if (isEditableTarget(event.target)) return

  const key = event.key.toLowerCase()

  if (!event.ctrlKey && !event.metaKey && !event.altKey && key === 'o') {
    event.preventDefault()
    event.stopPropagation()
    preselectLabelForOverlay()
    isLabelSelectActive.value = true
    return
  }

  if (!event.ctrlKey && !event.metaKey && !event.altKey && key === 'f') {
    event.preventDefault()
    event.stopPropagation()
    toggleFullscreen()
    return
  }

  if (isLabelSelectActive.value) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      event.stopPropagation()
      const labels = timelineLabels.value
      if (labels.length === 0) return
      const currentIndex = labels.findIndex((l) => l.name === selectedLabelType.value)
      const delta = event.key === 'ArrowUp' ? -1 : 1
      const startIndex = currentIndex === -1 ? (delta > 0 ? -1 : 0) : currentIndex
      const nextIndex = (startIndex + delta + labels.length) % labels.length
      selectedLabelType.value = labels[nextIndex].name
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      closeLabelOverlay()
      return
    }
  }

  if (event.key === 'Escape') {
    if (isLabelSelectActive.value) {
      event.preventDefault()
      event.stopPropagation()
      closeLabelOverlay()
      return
    }
    if (isMarkingLabel.value) {
      event.preventDefault()
      cancelLabelMarking()
    }
    return
  }

  const isPlus =
    event.key === '+' || event.code === 'NumpadAdd' || (event.code === 'Equal' && event.shiftKey)
  const isMinus = event.key === '-' || event.code === 'Minus' || event.code === 'NumpadSubtract'

  if (isPlus) {
    event.preventDefault()
    startLabelMarking()
    return
  }

  if (isMinus) {
    event.preventDefault()
    finishLabelMarking()
  }
}

const preselectLabelForOverlay = (): void => {
  const segments = timelineSegmentsForSelectedVideo.value
  if (segments.length === 0) return

  if (selectedSegmentId.value !== null) {
    const selectedSegment = segments.find((segment) => segment.id === selectedSegmentId.value)
    if (selectedSegment) {
      selectedLabelType.value = selectedSegment.label
      return
    }
  }

  const currentSegment = segments.find(
    (segment) => currentTime.value >= segment.startTime && currentTime.value <= segment.endTime
  )
  if (currentSegment) {
    selectedLabelType.value = currentSegment.label
  }
}

const startLabelMarking = (): void => {
  if (!canStartLabeling.value) return

  if (selectedVideoId.value) {
    videoStore.setCurrentVideo(selectedVideoId.value)
  }

  isMarkingLabel.value = true
  labelMarkingStart.value = currentTime.value

  // FIX: Use startDraft statt startDraftSegment
  videoStore.startDraft(selectedLabelType.value, currentTime.value)

  console.log(`Draft gestartet: ${selectedLabelType.value} bei ${formatTime(currentTime.value)}`)
}

const finishLabelMarking = async (): Promise<void> => {
  if (!isMarkingLabel.value || !selectedVideoId.value) return
  if (!canMutateSelectedSegments.value) {
    showErrorMessage(getSegmentMutationBlockedMessage())
    cancelLabelMarking()
    return
  }

  try {
    videoStore.setCurrentVideo(selectedVideoId.value)

    // FIX: Use updateDraftEnd und commitDraft statt finishDraftSegment
    videoStore.updateDraftEnd(currentTime.value)
    const createdSegment = await videoStore.commitDraft()
    if (!createdSegment) {
      showErrorMessage(videoStore.errorMessage || 'Label konnte nicht gespeichert werden.')
      return
    }

    // Reset state (keep last selected label)
    isMarkingLabel.value = false

    console.log('Label-Markierung abgeschlossen')
  } catch (error) {
    console.error('Error finishing label marking:', error)
  }
}

const cancelLabelMarking = (): void => {
  videoStore.cancelDraft()
  isMarkingLabel.value = false

  console.log('Label-Markierung abgebrochen')
}

const jumpToExamination = (examination: SavedExamination): void => {
  seekToTime(examination.timestamp)
  currentMarker.value =
    examinationMarkers.value.find((m) => m.id === `exam-${examination.id}`) || null
}

const deleteExamination = async (examinationId: number): Promise<void> => {
  try {
    await axiosInstance.delete(r(`examinations/${examinationId}/`))

    // Remove from local arrays
    savedExaminations.value = savedExaminations.value.filter((e) => e.id !== examinationId)
    examinationMarkers.value = examinationMarkers.value.filter(
      (m) => m.id !== `exam-${examinationId}`
    )

    // Clear current marker if it was deleted
    if (currentMarker.value?.id === `exam-${examinationId}`) {
      currentMarker.value = null
    }

    showSuccessMessage(`Untersuchung ${examinationId} gelöscht`)
    console.log('Examination deleted:', examinationId)
  } catch (error: any) {
    console.error('Error deleting examination:', error)
    const errorMsg =
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      error?.message ||
      String(error)
    showErrorMessage(errorMsg, 'danger')
  }
}

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

const segmentValidationPollingPromises = new Map<number, Promise<void>>()

type SegmentValidationResponseState = {
  jobStatus: string
  segmentAnnotationStatus: SegmentAnnotationStatus
  message: string
}

const normalizeSegmentValidationResponse = (responseData: any): SegmentValidationResponseState => {
  const postProcessingJob = responseData?.postProcessingJob ?? responseData?.post_processing_job
  const segmentAnnotationStatus =
    responseData?.segmentAnnotationStatus ?? responseData?.segment_annotation_status
  return {
    jobStatus: String(postProcessingJob?.status ?? responseData?.status ?? ''),
    segmentAnnotationStatus: (segmentAnnotationStatus ?? 'not_started') as SegmentAnnotationStatus,
    message: String(responseData?.error ?? responseData?.message ?? '')
  }
}

const pollSegmentValidationStatus = (
  videoId: number,
  options: { showTerminalMessages?: boolean } = {}
): Promise<void> => {
  const existingPromise = segmentValidationPollingPromises.get(videoId)
  if (existingPromise) return existingPromise

  const showTerminalMessages = options.showTerminalMessages ?? true
  const maxAttempts = 120
  const intervalMs = 5000

  const pollingPromise = (async () => {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (attempt > 0) {
        await sleep(intervalMs)
      }
      await videoStore.fetchAllVideos()
      const status = getVideoSegmentAnnotationStatus(videoId)
      if (status === 'validated') {
        videoRef.value?.load()
        if (showTerminalMessages) {
          showSuccessMessage('Segmentvalidierung abgeschlossen.')
        }
        return
      }
      if (status === 'cleanup_failed') {
        const video = videoList.value.videos.find((v) => v.id === videoId)
        const details = video?.postValidationRebuild?.details
        if (showTerminalMessages) {
          showErrorMessage(
            `Segmentvalidierung fehlgeschlagen${details ? `: ${details}` : '.'}`,
            'danger'
          )
        }
        return
      }
      if (status === 'cleanup_required' || status === 'not_started') {
        if (showTerminalMessages) {
          showErrorMessage('Segmentvalidierung wartet auf die Nachverarbeitung.', 'danger')
        }
        return
      }
    }
    if (showTerminalMessages) {
      showSuccessMessage('Segmentvalidierung läuft weiter. Die Videoliste aktualisiert den Status.')
    }
  })().finally(() => {
    segmentValidationPollingPromises.delete(videoId)
  })

  segmentValidationPollingPromises.set(videoId, pollingPromise)
  return pollingPromise
}

const pollExistingSegmentCleanupVideos = (): void => {
  videoList.value.videos
    .filter((video) => isSegmentCleanupPending(video.id))
    .forEach((video) => {
      void pollSegmentValidationStatus(video.id, { showTerminalMessages: false })
    })
}

// Validate all video segments (complete video review)
const submitVideoSegments = async (videoId: number): Promise<void> => {
  if (segmentSourceMode.value === 'prediction') {
    showErrorMessage('KI-Vorhersagen müssen zuerst als manuelle Segmente übernommen werden.')
    return
  }
  if (!videoId) {
    showErrorMessage('Kein Video ausgewählt')
    return
  }

  if (!canMutateSelectedSegments.value) {
    showErrorMessage(getSegmentMutationBlockedMessage())
    return
  }

  if (validationRequestVideoId.value !== null) {
    showErrorMessage(`Validierung für Video ${validationRequestVideoId.value} läuft bereits.`)
    return
  }

  const segmentsForRequest = [...timelineSegmentsForSelectedVideo.value]
  const segmentCount = segmentsForRequest.length

  if (segmentCount === 0) {
    showErrorMessage('Keine Segmente zum Validieren vorhanden')
    return
  }

  validationRequestVideoId.value = videoId

  // Confirm with user before validation
  if (
    !confirm(
      `Möchten Sie alle ${segmentCount} Segmente von Video ${videoId} als validiert markieren? Außerhalb-Segmente werden danach geschwärzt.`
    )
  ) {
    validationRequestVideoId.value = null
    return
  }

  // Build payload including updated start/end times (in seconds)
  const segmentPayload = segmentsForRequest
    .filter((s) => typeof s.id === 'number')
    .map((s) => ({
      id: s.id as number,
      // assuming Segment has startTime/endTime in seconds
      start_time: s.startTime,
      end_time: s.endTime
    }))

  console.log('🔄 Sending segments to backend:', segmentPayload)

  try {
    console.log(`🔍 Validating all segments for video ${videoId}...`)

    const response = await axiosInstance.post(
      r(`media/videos/${videoId}/segments/validate-bulk/`),
      {
        segmentIds: segmentPayload.map((s) => s.id),
        segments: segmentPayload,
        isValidated: true,
        notes: `Vollständige Video-Review abgeschlossen am ${new Date().toLocaleString('de-DE')}`,
        informationSourceName: 'manual_annotation', // or 'manual_validation', see backend
        annotator: activeAnnotatorPrincipal.value
      }
    )

    console.log('✅ Validation response:', response.data)
    const validationState = normalizeSegmentValidationResponse(response.data)

    if (
      validationState.jobStatus === 'queued' ||
      validationState.jobStatus === 'already_queued' ||
      validationState.segmentAnnotationStatus === 'cleanup_queued' ||
      validationState.segmentAnnotationStatus === 'cleanup_running'
    ) {
      showSuccessMessage('Segmentprüfung gespeichert. Nachverarbeitung läuft.')
      await pollSegmentValidationStatus(videoId)
    } else if (
      validationState.jobStatus === 'failed' ||
      validationState.segmentAnnotationStatus === 'cleanup_failed'
    ) {
      showErrorMessage(
        `Validierung fehlgeschlagen${validationState.message ? `: ${validationState.message}` : '.'}`,
        'danger'
      )
    } else {
      showSuccessMessage(
        `Erfolgreich! ${response.data.updatedCount} von ${response.data.totalSegments ?? response.data.requestedCount} Segmenten validiert.`
      )
      await videoStore.fetchAllVideos()
    }
    lastValidationClickedVideoId.value = videoId

    // Reload segments to reflect validation status + updated times
    await loadVideoSegments()
  } catch (error: any) {
    console.error('❌ Error validating video segments:', error)
    const errorMsg = error?.response?.data?.error || error?.message || 'Unbekannter Fehler'
    showErrorMessage(`Validierung fehlgeschlagen: ${errorMsg}`)
  } finally {
    if (validationRequestVideoId.value === videoId) {
      validationRequestVideoId.value = null
    }
  }
}

const handleValidateAndMark = async (videoId: number | null): Promise<void> => {
  if (!videoId) {
    showErrorMessage('Kein Video ausgewählt')
    return
  }

  await submitVideoSegments(videoId)
}

type OutsideBlackeningResponseState = {
  outsideSegmentCount: number
  jobStatus: string
  message: string
}

const setOutsideBlackeningRequestState = (videoId: number, isPending: boolean): void => {
  const nextRequestVideoIds = new Set(outsideBlackeningRequestVideoIds.value)
  if (isPending) {
    nextRequestVideoIds.add(videoId)
  } else {
    nextRequestVideoIds.delete(videoId)
  }
  outsideBlackeningRequestVideoIds.value = nextRequestVideoIds
}

const normalizeOutsideBlackeningResponse = (responseData: any): OutsideBlackeningResponseState => {
  const postProcessingJob = responseData?.postProcessingJob ?? responseData?.post_processing_job
  return {
    outsideSegmentCount: Number(
      responseData?.outsideSegmentCount ?? responseData?.outside_segment_count ?? 0
    ),
    jobStatus: String(postProcessingJob?.status ?? responseData?.status ?? ''),
    message: String(responseData?.error ?? responseData?.message ?? '')
  }
}

const handleOutsideBlackeningResponseState = (
  responseState: OutsideBlackeningResponseState
): boolean => {
  const { outsideSegmentCount, jobStatus, message } = responseState

  if (jobStatus === 'completed') {
    videoRef.value?.load()
    showSuccessMessage(`Außerhalb-Segmente geschwärzt (${outsideSegmentCount} Segmente).`)
    return true
  }

  if (jobStatus === 'queued') {
    showSuccessMessage(
      `Schwärzung der Außerhalb-Segmente gestartet (${outsideSegmentCount} Segmente).`
    )
    return true
  }

  if (jobStatus === 'already_queued') {
    showSuccessMessage('Schwärzung der Außerhalb-Segmente läuft bereits.')
    return true
  }

  if (jobStatus === 'busy') {
    showErrorMessage('Ein anderer Verarbeitungsvorgang für dieses Video läuft bereits.')
    return true
  }

  if (jobStatus === 'failed') {
    showErrorMessage(
      `Schwärzung der Außerhalb-Segmente fehlgeschlagen${message ? `: ${message}` : '.'}`,
      'danger'
    )
    return true
  }

  if (jobStatus === 'noop' || (!jobStatus && outsideSegmentCount === 0)) {
    showSuccessMessage('Keine Außerhalb-Segmente gefunden. Es wurde nichts gestartet.')
    return true
  }

  return false
}

const blackenOutsideSegmentsForSelectedVideo = async (): Promise<void> => {
  const videoId = selectedVideoId.value
  if (!videoId) {
    showErrorMessage('Kein Video ausgewählt')
    return
  }

  if (!canAnnotateSegments(videoId)) {
    showErrorMessage(
      'Außerhalb-Segmente können erst nach validierter Anonymisierung geschwärzt werden.'
    )
    return
  }

  if (outsideBlackeningRequestVideoIds.value.has(videoId)) {
    showErrorMessage(`Schwärzung für Video ${videoId} wird bereits gestartet.`)
    return
  }

  if (!confirm(`Außerhalb-Segmente für Video ${videoId} erneut schwärzen?`)) {
    return
  }

  setOutsideBlackeningRequestState(videoId, true)
  try {
    const response = await axiosInstance.post(
      r(endpoints.media.videoSegmentsBlackenOutside(videoId)),
      {
        onlyValidated: false
      }
    )
    if (handleOutsideBlackeningResponseState(normalizeOutsideBlackeningResponse(response.data))) {
      return
    }

    showErrorMessage('Unerwarteter Status beim Schwärzen der Außerhalb-Segmente.', 'danger')
  } catch (error: any) {
    const responseData = error?.response?.data
    if (
      responseData &&
      handleOutsideBlackeningResponseState(normalizeOutsideBlackeningResponse(responseData))
    ) {
      return
    }
    console.error('Fehler beim Schwärzen der Außerhalb-Segmente:', error)
    await guarded(Promise.reject(error))
  } finally {
    setOutsideBlackeningRequestState(videoId, false)
  }
}

const saveSegmentChanges = async (): Promise<void> => {
  if (!canMutateSelectedSegments.value) {
    showErrorMessage(getSegmentMutationBlockedMessage())
    return
  }
  if (segmentSourceMode.value === 'prediction') {
    showErrorMessage(
      'Änderungen an KI-Vorhersagen werden erst mit "Als manuelle Segmente übernehmen" persistiert.'
    )
    return
  }
  try {
    await videoStore.persistDirtySegments()
    showSuccessMessage('Segment-Änderungen gespeichert')
  } catch (error: any) {
    console.error('Fehler beim Speichern der Segment-Änderungen:', error)
    await guarded(Promise.reject(error))
  }
}

const discardSegmentChanges = (): void => {
  if (!canMutateSelectedSegments.value) {
    showErrorMessage(getSegmentMutationBlockedMessage())
    return
  }
  if (segmentSourceMode.value === 'prediction') {
    void loadVideoSegments()
    showSuccessMessage('Lokale Änderungen an KI-Vorhersagen verworfen')
    return
  }
  // simplest version: reload from backend
  if (!selectedVideoId.value) return
  videoStore.fetchVideoSegments(selectedVideoId.value)
  showSuccessMessage('Lokale Änderungen verworfen')
}

const importPredictionSegmentsToManual = async (): Promise<void> => {
  if (!selectedVideoId.value) return
  if (!canMutateSelectedSegments.value) {
    showErrorMessage(getSegmentMutationBlockedMessage())
    return
  }
  if (timelineSegmentsForSelectedVideo.value.length === 0) {
    showErrorMessage('Keine KI-Segmente zum Übernehmen vorhanden')
    return
  }

  isImportingPredictionSegments.value = true
  try {
    const payload = {
      replace_existing: true,
      segments: timelineSegmentsForSelectedVideo.value.map((segment) => ({
        label_name: segment.label,
        start_time: segment.startTime,
        end_time: segment.endTime,
        export_segment: Boolean(segment.exportSegment)
      }))
    }

    await axiosInstance.post(
      r(endpoints.media.videoSegmentsImportPredictions(selectedVideoId.value)),
      payload
    )

    segmentSourceMode.value = 'manual'
    await loadVideoSegments()
    showSuccessMessage('KI-Vorhersagen wurden als manuelle Segmente übernommen')
  } catch (error: any) {
    console.error('Error importing prediction segments:', error)
    await guarded(Promise.reject(error))
  } finally {
    isImportingPredictionSegments.value = false
  }
}

const rerunPredictionSegmentsForSelectedVideo = async (): Promise<void> => {
  if (!selectedVideoId.value || !canRerunPredictionSegments.value) return

  isRerunningPredictionSegments.value = true
  try {
    const payload =
      predictionModelMode.value === 'huggingface'
        ? {
            hfModelId: huggingFaceModelId.value.trim(),
            labelsetName: defaultPredictionLabelsetName.value,
            replacePredictionSegments: true,
            deleteFramesAfter: true
          }
        : {
            modelMetaId: selectedPredictionModelMetaId.value,
            replacePredictionSegments: true,
            deleteFramesAfter: true
          }

    const response = await videoStore.rerunPredictionSegments(selectedVideoId.value, payload)
    await videoStore.fetchPredictionModels()
    segmentSourceMode.value = 'prediction'
    await loadVideoSegments()
    showSuccessMessage(
      `KI-Vorhersagen neu berechnet (${response.predictionSegmentsCount} Segmente)`
    )
  } catch (error: any) {
    console.error('Error rerunning prediction segments:', error)
    await guarded(Promise.reject(error))
  } finally {
    isRerunningPredictionSegments.value = false
  }
}

// Video event handlers from AnonymizationValidationComponent
const onVideoError = (event: Event): void => {
  if (isAbortLikeError(event)) {
    console.debug('[VideoExamination] Ignoring aborted video load:', event)
    return
  }

  console.error('Video loading error:', event)
  const video = event.target as HTMLVideoElement
  console.error('Video error details:', {
    error: video.error,
    networkState: video.networkState,
    readyState: video.readyState,
    currentSrc: video.currentSrc
  })
  showErrorMessage('Fehler beim Laden des Videos. Bitte versuchen Sie es erneut.')
}

const onVideoLoadStart = (): void => {
  console.log('Video loading started for:', anonymizedVideoSrc.value)
}

const onVideoCanPlay = (): void => {
  console.log('Video can play, loaded successfully')
}

const getVideoDropdownStatusText = (videoId: number): string => {
  const status = getVideoDropdownStatus(videoId)
  if (status === 'not_usable') {
    return `Noch nicht nutzbar: ${getStatusText(getVideoAnonymizationStatus(videoId))}`
  }
  if (status === 'annotation_validated') return 'Video bereits validiert'
  if (status === 'annotation_cleanup_pending') return 'Segmentvalidierung läuft'
  if (status === 'annotation_cleanup_failed') return 'Segmentvalidierung prüfen'
  if (status === 'ready_for_annotation') return 'Video startklar für Befundung!'
  return 'Zurück zu Schritt 1 - Anonymisierung validieren'
}

const getSegmentAnnotationStatusBadgeText = (videoId: number): string => {
  const status = getVideoSegmentAnnotationStatus(videoId)
  if (status === 'cleanup_queued' || status === 'cleanup_running') {
    return 'Außerhalb-Frames werden geschwärzt'
  }
  if (status === 'cleanup_failed') return 'Außerhalb-Frame-Prüfung fehlgeschlagen'
  if (status === 'cleanup_required') return 'Außerhalb-Frame-Prüfung erforderlich'
  if (status === 'validated' || isAnnotationFinished(videoId)) {
    return 'Segmentvalidiert'
  }
  return ''
}

const getSegmentAnnotationStatusBadgeClass = (videoId: number): string => {
  const status = getVideoSegmentAnnotationStatus(videoId)
  if (status === 'cleanup_queued' || status === 'cleanup_running') return 'bg-info text-dark'
  if (status === 'cleanup_failed' || status === 'cleanup_required') return 'bg-warning text-dark'
  if (status === 'validated' || isAnnotationFinished(videoId)) return 'bg-success'
  return 'bg-secondary'
}

const getVideoDropdownStatusBadgeClass = (videoId: number): string => {
  const status = getVideoDropdownStatus(videoId)
  if (status === 'not_usable') return 'badge-unusable'
  if (status === 'annotation_validated') return 'badge-validated'
  if (status === 'annotation_cleanup_pending') return 'badge-cleanup'
  if (status === 'annotation_cleanup_failed') return 'badge-pending'
  if (status === 'ready_for_annotation') return 'badge-ready'
  return 'badge-pending'
}

const getVideoDropdownItemClass = (videoId: number): string => {
  const status = getVideoDropdownStatus(videoId)
  if (status === 'not_usable') return 'video-dropdown-item-unusable'
  if (status === 'annotation_validated') return 'video-dropdown-item-validated'
  if (status === 'annotation_cleanup_pending') return 'video-dropdown-item-cleanup'
  if (status === 'annotation_cleanup_failed') return 'video-dropdown-item-pending'
  if (status === 'ready_for_annotation') return 'video-dropdown-item-ready'
  return 'video-dropdown-item-pending'
}

const getVideoDropdownStatus = (videoId: number): VideoDropdownStatus => {
  // Keep anonymization validation and segment annotation validation separate:
  // filters decide visibility, while this resolver alone decides row color/text.
  if (!canViewProcessedVideo(videoId)) return 'not_usable'
  if (isAnnotationFinished(videoId)) return 'annotation_validated'
  const segmentStatus = getVideoSegmentAnnotationStatus(videoId)
  if (segmentStatus === 'cleanup_queued' || segmentStatus === 'cleanup_running') {
    return 'annotation_cleanup_pending'
  }
  if (segmentStatus === 'cleanup_failed' || segmentStatus === 'cleanup_required') {
    return 'annotation_cleanup_failed'
  }
  return isVideoValidated(videoId) ? 'ready_for_annotation' : 'pending_anonymization_validation'
}

function getVideoCountByDropdownStatus(status: VideoDropdownStatus): number {
  return videos.value.filter((video) => getVideoDropdownStatus(video.id) === status).length
}

// ✅ NEW: Helper functions for video status display
const getVideoStatusIndicator = (videoId: number): string => {
  if (!canViewProcessedVideo(videoId))
    return `Noch nicht nutzbar: ${getStatusText(getVideoAnonymizationStatus(videoId))}`
  if (canAnnotateSegments(videoId) && isAnnotationFinished(videoId))
    return 'Video bereits validiert'

  const item = getVideoOverviewItem(videoId)
  if (!item) return ''

  const statusIndicators: { [key: string]: string } = {
    not_started: '⏳ Wartend',
    processing_anonymization: '🔄 In Verarbeitung',
    extracting_frames: '🎬 Frames',
    started: 'Gestartet',
    anonymized: 'Anonymisiert, Metadaten noch offen',
    done_processing_anonymization: 'Zurück zu Schritt 1 - Anonymisierung validieren',
    validated: 'Video startklar für Befundung!',
    unknown: 'Status unbekannt',
    failed: '❌ Fehler'
  }

  return statusIndicators[item.anonymizationStatus] || item.anonymizationStatus
}

const getVideoCountByStatus = (status: string): number => {
  return overview.value.filter((o) => o.mediaType === 'video' && o.anonymizationStatus === status)
    .length
}

const getStatusBadgeClass = (status: string): string => {
  const classes: { [key: string]: string } = {
    not_started: 'bg-secondary',
    processing_anonymization: 'bg-warning',
    extracting_frames: 'bg-info',
    predicting_segments: 'bg-info',
    started: 'bg-info',
    anonymized: 'bg-warning',
    done_processing_anonymization: 'bg-success',
    validated: 'bg-primary',
    unknown: 'bg-secondary',
    failed: 'bg-danger'
  }
  return classes[status] || 'bg-secondary'
}

const getStatusText = (status: string): string => {
  const texts: { [key: string]: string } = {
    not_started: 'Nicht gestartet',
    processing_anonymization: 'Anonymisierung läuft',
    extracting_frames: 'Frames extrahieren',
    predicting_segments: 'Segmente vorhersagen',
    started: 'Gestartet',
    anonymized: 'Anonymisiert',
    done_processing_anonymization: 'Fertig',
    validated: 'Validiert',
    unknown: 'Status unbekannt',
    failed: 'Fehlgeschlagen'
  }
  return texts[status] || status
}

// Tracks anonymization validation. Segment annotation validation is tracked by isAnnotationFinished().
const isVideoValidated = (videoId: number): boolean => {
  const item = getVideoOverviewItem(videoId)
  return item?.anonymizationStatus === 'validated'
}

// Fire loader whenever selectedVideoId changes programmatically.
// Keep this after all setup bindings it can call; immediate watchers run during setup.
watch(selectedVideoId, async (newId) => {
  console.log('Selected video ID changed, syncing store and loading details:', newId)
  if (typeof newId === 'number') {
    videoStore.setCurrentVideo(newId)
  } else if (newId !== null) {
    showErrorMessage('Invalid video ID')
    return
  }

  await loadSelectedVideo()
  if (newId !== null && canViewProcessedVideo(newId)) {
    await loadVideoSegments()
  }
})

watch(
  () => route.query.video,
  (v) => {
    const id = Number(v ?? '') || null
    if (id !== selectedVideoId.value) selectedVideoId.value = id
  },
  { immediate: true }
)
</script>

<style scoped>
.video-container {
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  z-index: 100;
}

:fullscreen .label-overlay {
  display: flex !important;
  z-index: 2147483647;
}

.fullscreen-toggle {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 6;
  border: none;
  border-radius: 999px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  cursor: pointer;
}

.fullscreen-toggle:hover {
  background: rgba(0, 0, 0, 0.75);
}

.simple-timeline-track {
  position: relative;
  height: 20px;
  background: #e9ecef;
  border-radius: 10px;
  cursor: pointer;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #0056b3);
  border-radius: 10px;
  transition: width 0.1s ease;
}

.examination-marker {
  position: absolute;
  top: 0;
  width: 3px;
  height: 100%;
  background: #dc3545;
  cursor: pointer;
  z-index: 2;
}

.examination-marker:hover {
  background: #c82333;
  width: 5px;
}

.timeline-wrapper {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 15px;
  background: #f8f9fa;
}

.timeline-controls {
  border-top: 1px solid #dee2e6;
  padding-top: 15px;
}

.control-select {
  min-width: 180px;
}

.control-button {
  min-width: 140px;
}

.list-group-item {
  border: none;
  border-bottom: 1px solid #dee2e6;
}

.list-group-item:last-child {
  border-bottom: none;
}

/* ✅ NEW: Status display enhancements */
.video-status-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-left: 4px solid #007bff;
}

.status-badge-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.status-badge-container .badge {
  font-size: 0.75rem;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
}

.hint-alert {
  border-color: #b6effb;
  color: #055160;
  background: #cff4fc;
}

.video-dropdown-option {
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.video-dropdown {
  position: relative;
}

.video-dropdown-trigger {
  width: 100%;
  min-height: 42px;
  border: 1px solid #ced4da;
  border-radius: 0.375rem;
  background: #ffffff;
  color: #212529;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.video-dropdown-trigger:disabled {
  background: #e9ecef;
  color: #6c757d;
  cursor: not-allowed;
}

.video-dropdown-trigger-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-dropdown-menu {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  z-index: 2000;
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid #ced4da;
  border-radius: 0.5rem;
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
}

.video-dropdown-search {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 0.625rem;
  background: #ffffff;
  border-bottom: 1px solid #eef1f4;
}

.video-dropdown-search-input {
  width: 100%;
  border: 1px solid #ced4da;
  border-radius: 0.375rem;
  color: #212529;
  font-size: 0.875rem;
  padding: 0.45rem 0.65rem;
}

.video-dropdown-search-input:focus {
  outline: none;
  border-color: #0d6efd;
  box-shadow: 0 0 0 0.16rem rgba(13, 110, 253, 0.16);
}

.video-dropdown-filters {
  position: sticky;
  top: 55px;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0 0.625rem 0.625rem;
  background: #ffffff;
  border-bottom: 1px solid #eef1f4;
}

.video-dropdown-filter-button {
  border: 1px solid #ced4da;
  border-radius: 999px;
  background: #ffffff;
  color: #495057;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.2;
  padding: 0.28rem 0.65rem;
}

.video-dropdown-filter-button:hover,
.video-dropdown-filter-button.active {
  border-color: #0d6efd;
  background: #e7f1ff;
  color: #0a58ca;
}

.video-dropdown-empty {
  color: #6c757d;
  font-size: 0.875rem;
  padding: 0.85rem;
  text-align: center;
}

.video-dropdown-item {
  width: 100%;
  border: none;
  border-left: 0.75rem solid transparent;
  background: transparent;
  padding: 0.75rem 0.85rem;
  text-align: left;
  border-bottom: 1px solid #eef1f4;
}

.video-dropdown-item:last-child {
  border-bottom: none;
}

.video-dropdown-item:hover:not(:disabled) {
  background: #f8f9fa;
}

.video-dropdown-item:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.video-dropdown-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.video-dropdown-title {
  font-weight: 600;
}

.video-dropdown-status-badge {
  font-size: 0.78rem;
  font-weight: 700;
  border-radius: 999px;
  padding: 0.28rem 0.72rem;
  white-space: nowrap;
}

.badge-ready {
  background: #198754;
  color: #ffffff;
}

.badge-validated {
  background: #0d6efd;
  color: #ffffff;
}

.badge-cleanup {
  background: #0dcaf0;
  color: #073642;
}

.badge-pending {
  background: #ffc107;
  color: #212529;
}

.badge-unusable {
  background: #6c757d;
  color: #ffffff;
}

.video-dropdown-meta {
  font-size: 0.78rem;
  color: #5f6b76;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.video-dropdown-annotators {
  margin-top: 0.35rem;
  font-size: 0.78rem;
  color: #495057;
}

.video-dropdown-annotators-other {
  color: #0d6efd;
  font-weight: 700;
}

.video-dropdown-item-selected {
  background: #e7f1ff;
}

.video-dropdown-item-validated {
  border-left-color: #0d6efd;
}

.video-dropdown-item-ready {
  border-left-color: #198754;
}

.video-dropdown-item-cleanup {
  border-left-color: #0dcaf0;
}

.video-dropdown-item-pending {
  border-left-color: #ffc107;
}

.video-dropdown-item-unusable {
  border-left-color: #6c757d;
}

.validation-status-alert {
  border-left: 4px solid #28a745;
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
}

.validation-processing-alert {
  border-left: 4px solid #0dcaf0;
  background: #eefaff;
}

.validation-failed-alert {
  border-left: 4px solid #ffc107;
  background: #fff8e1;
}

.validation-status-alert .ni {
  opacity: 0.8;
}

.validation-action-button {
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.45rem 1rem;
  border-radius: 999px;
  border: 1px solid #1f7a3a;
  background: linear-gradient(135deg, #32b55b 0%, #239245 100%);
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(35, 146, 69, 0.25);
}

.validation-action-button:hover {
  background: linear-gradient(135deg, #2ca650 0%, #1f7a3a 100%);
  color: #ffffff;
}

.validation-action-button:focus {
  box-shadow: 0 0 0 0.2rem rgba(35, 146, 69, 0.3);
}

.validation-action-button-clicked {
  border-color: #0f5a2b;
  background: linear-gradient(135deg, #248649 0%, #176b37 100%);
  box-shadow: 0 0 0 0.2rem rgba(36, 134, 73, 0.28);
}

.validation-action-icon {
  font-size: 18px;
}

.validation-click-indicator {
  border: 1px solid #d5dbe3;
}

.validation-click-indicator-active {
  background: linear-gradient(135deg, #e4f7eb 0%, #d2f0dd 100%);
  border-color: #2e9e55;
  color: #165b33;
}

.validation-click-indicator-muted {
  background: #f8f9fa;
  color: #495057;
}

.label-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  z-index: 2147483647;
}

.label-overlay-card {
  background: #ffffff;
  border-radius: 10px;
  padding: 12px;
  min-width: 260px;
  max-width: 70%;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.label-overlay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  margin-bottom: 4px;
}

.label-overlay-close {
  border: none;
  background: transparent;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.label-overlay-hint {
  font-size: 0.8rem;
  color: #6c757d;
  margin-bottom: 8px;
}

.label-overlay-list {
  display: grid;
  gap: 6px;
  max-height: 45vh;
  overflow: auto;
}

.label-overlay-item {
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  background: #f8f9fa;
  cursor: pointer;
}

.label-overlay-item.active {
  border-color: #0d6efd;
  background: #e7f1ff;
}

.shortcuts-details {
  display: inline-block;
}

.shortcuts-toggle {
  list-style: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px 2px 6px;
  border: 1px solid #dee2e6;
  border-radius: 999px;
  background: #f8f9fa;
  cursor: pointer;
  user-select: none;
}

.shortcuts-toggle::-webkit-details-marker {
  display: none;
}

.shortcuts-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #0d6efd;
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  line-height: 1;
}

.shortcuts-body {
  margin-top: 6px;
  padding: 6px 10px;
  border: 1px dashed #dee2e6;
  border-radius: 6px;
  background: #fff;
}

.prediction-rerun-controls .model-mode-select {
  max-width: 180px;
}

.prediction-rerun-controls .prediction-model-select,
.prediction-rerun-controls .huggingface-model-input {
  min-width: min(100%, 280px);
  max-width: 420px;
}

.annotator-override-input {
  max-width: 320px;
}
</style>
