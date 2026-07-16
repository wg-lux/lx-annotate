<template>
  <div class="container-fluid py-4">
    <div class="card">
      <div class="card-header pb-0">
        <h4 class="mb-0">Anonymisierungsvalidierung und Annotationen</h4>
      </div>
      <div class="card-body">
        <!-- Loading / Error States -->
        <div v-if="anonymizationStore.loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Wird geladen...</span>
          </div>
          <p class="mt-2">Anonymisierte Daten werden geladen...</p>
        </div>

        <div v-else-if="anonymizationStore.error" class="alert alert-danger" role="alert">
          <strong>Fehler:</strong> {{ anonymizationStore.error }}
        </div>

        <div v-else-if="!currentItem" class="alert alert-info" role="alert" @loadstart="anonymizationStore.fetchNext()">
          Alle Anonymisierungen wurden bearbeitet.
        </div>
          
          <!-- Processing Status Alert -->
          <div v-if="anonymizationStore.isAnyFileProcessing" class="alert alert-warning mt-3">
            <i class="ni ni-user-run me-2"></i>
            <strong>{{ anonymizationStore.processingFiles.length }} Datei(en)</strong> werden gerade anonymisiert.
            <div class="mt-2">
              <router-link to="/anonymisierung/uebersicht" class="btn btn-sm btn-outline-primary">
                <i class="ni ni-user-run me-1"></i>
                Zur Übersicht
              </router-link>
            </div>
          </div>
        </div>

        <!-- Main Content When Data is Available -->
        <template v-if="currentItem">
          <!-- Content Type Indicator -->
          <div class="row mb-3">
            <div class="col-12">
              <div class="alert alert-info d-flex align-items-center justify-content-between" role="alert">
                <div>
                  <i class="ni ni-user-run me-2"></i>
                  <span>
                    <strong>Validierung:</strong> 
                    {{ isPdf ? 'PDF-Dokument' : isVideo ? 'Video-Datei' : 'Unbekanntes Format' }}
                    {{ currentItem?.centerName ? `- ${currentItem.centerName}` : '' }}
                    <span
                      v-if="currentFileIdLabel"
                      class="badge bg-secondary ms-2 align-middle"
                      title="ID aus der Anonymisierungs-Übersicht"
                    >
                      {{ currentFileIdLabel }}
                    </span>
                  </span>
                </div>
                <div v-if="currentItem && (isVideo || isPdf)" class="text-end">
                  <small class="text-muted">
                    <i class="ni ni-settings-gear-65 me-1"></i>
                    {{ isVideo ? 'Video-Korrektur verfügbar' : 'Text-Korrektur verfügbar' }}
                  </small>
                </div>
              </div>
            </div>
          </div>


          <div class="row mb-4">
            <div class="col-12">
              <label class="form-label" for="noMoreNamesConfirmation">
                Weitere Namen im Video oder PDF
              </label>
              <select
                id="noMoreNamesConfirmation"
                v-model="noMoreNamesConfirmation"
                class="form-select"
              >
                <option value="unknown">Nicht bewertet</option>
                <option value="confirmed">Keine weiteren Namen vorhanden</option>
                <option value="not_confirmed">Weitere Namen nicht ausgeschlossen</option>
              </select>
              <small class="form-text text-muted">
                Diese Angabe ist optional und blockiert die Validierung nicht.
              </small>
            </div>
          </div>

          <!-- ✨ Phase 2.2: Centralized Validation Error Panel -->
          <div v-if="validationErrors.length > 0" class="row mb-4">
            <div class="col-12">
              <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <h6 class="alert-heading">
                  <i class="ni ni-user-run me-2"></i>
                  {{ validationErrorSummary }}
                </h6>
                <hr>
                <ul class="mb-0">
                  <li v-for="(error, index) in validationErrors" :key="index">
                    {{ error }}
                  </li>
                </ul>
                <button type="button" class="btn-close" @click="clearValidationErrors" aria-label="Schließen"></button>
              </div>
            </div>
          </div>

          <div class="row mb-4">
            <!-- Patient Information & Annotation Section (Reduced Width) -->
            <div class="col-md-5">
              <div class="card bg-light mb-4">
                <div class="card-body">
                  <h5 class="card-title">Patienteninformationen</h5>
                  <div class="mb-3">
                    <label class="form-label">Vorname:</label>
                    <input 
                      type="text" 
                      class="form-control" 
                      v-model="editedPatient.patientFirstName"
                      :class="{ 'is-invalid': !firstNameOk }"
                    >
                    <div class="invalid-feedback" v-if="!firstNameOk">
                      Vorname ist erforderlich.
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Nachname:</label>
                    <input 
                      type="text" 
                      class="form-control" 
                      v-model="editedPatient.patientLastName"
                      :class="{ 'is-invalid': !lastNameOk }"
                    >
                    <div class="invalid-feedback" v-if="!lastNameOk">
                      Nachname ist erforderlich.
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Geschlecht:</label>
                    <select class="form-select" v-model="editedPatient.patientGenderName">
                      <option value="male">Männlich</option>
                      <option value="female">Weiblich</option>
                      <option value="unknown">Divers</option>
                    </select>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Geburtsdatum:</label>
                    <input 
                      type="text"
                      class="form-control" 
                      v-model="editedPatient.patientDob"
                      :class="{ 'is-invalid': !isDobValid }"
                      placeholder="TT.MM.JJJJ"
                      inputmode="numeric"
                      autocomplete="bday"
                      @blur="onDobBlur"
                    >
                    <small class="form-text text-muted">
                      <i class="ni ni-user-run me-1"></i>
                      <span v-if="dobDisplayFormat" class="ms-2 badge bg-secondary">
                        {{ dobDisplayFormat }}
                      </span>
                    </small>
                    <div class="invalid-feedback" v-if="!isDobValid">
                      {{ dobErrorMessage || 'Gültiges Geburtsdatum ist erforderlich.' }}
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Fallnummer:</label>
                    <input 
                      type="text" 
                      class="form-control" 
                      v-model="editedPatient.casenumber"
                    >
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Untersuchungsdatum:</label>
                    <input 
                      type="text"
                      class="form-control" 
                      v-model="examinationDate"
                      :class="{ 'is-invalid': !isExaminationDateValid }"
                      placeholder="TT.MM.JJJJ"
                      inputmode="numeric"
                      autocomplete="off"
                      @blur="onExamDateBlur"
                    >
                    <small class="form-text text-muted">
                      <i class="ni ni-user-run me-1"></i>
                      <span v-if="examDateDisplayFormat" class="ms-2 badge bg-secondary">
                        {{ examDateDisplayFormat }}
                      </span>
                    </small>
                    <div class="invalid-feedback" v-if="!isExaminationDateValid">
                      {{ examDateErrorMessage || 'Das Untersuchungsdatum darf nicht vor dem Geburtsdatum liegen.' }}
                    </div>
                  </div>
                  <div v-if="isPdf" class="mb-3">
                    <label class="form-label">Dokumenttyp:</label>
                    <select
                      class="form-select"
                      v-model="selectedDocumentType"
                      :class="{ 'is-invalid': documentTypeTouched && !hasValidDocumentType }"
                    >
                      <option value="" disabled>Bitte Dokumenttyp wählen</option>
                      <option
                        v-for="option in documentTypeOptions"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </option>
                    </select>
                    <small class="form-text text-muted" v-if="isLoadingDocumentTypes">
                      Dokumenttypen werden geladen...
                    </small>
                    <small class="form-text text-danger" v-else-if="documentTypeLoadError">
                      {{ documentTypeLoadError }}
                    </small>
                    <div class="invalid-feedback" v-if="documentTypeTouched && !hasValidDocumentType">
                      Dokumenttyp ist für die PDF-Validierung erforderlich.
                    </div>
                  </div>
                  <div v-if="isPdf" class="mb-3">
                    <label class="form-label">Befund-Fall (PatientExamination):</label>
                    <select class="form-select" v-model="selectedPatientExaminationOption">
                      <option value="">Über Reporting-Fallauflösung bestimmen</option>
                      <option
                        v-for="option in patientExaminationOptions"
                        :key="option.id"
                        :value="String(option.id)"
                      >
                        {{ option.label }}
                      </option>
                      <option value="__manual__">Andere ID manuell eingeben</option>
                    </select>
                    <input
                      v-if="selectedPatientExaminationOption === '__manual__'"
                      type="number"
                      min="1"
                      step="1"
                      class="form-control mt-2"
                      placeholder="PatientExamination-ID eingeben"
                      v-model="manualPatientExaminationId"
                    >
                    <small class="form-text text-muted" v-if="isLoadingPatientExaminations">
                      Untersuchungen werden geladen...
                    </small>
                    <small class="form-text text-danger" v-else-if="patientExaminationLoadError">
                      {{ patientExaminationLoadError }}
                    </small>
                    <small class="form-text text-muted d-block mt-1">
                      Diese Auswahl ist optional. Die eigentliche Fallauflösung erfolgt über den Reporting-Bereich.
                    </small>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Anonymisierter Text:</label>
                    <textarea class="form-control"
                      rows="6"
                      v-model="editedAnonymizedText"></textarea>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Externe ID:</label>
                      <textarea
                        class="form-control"
                        v-model="editedPatient.externalId"
                      ></textarea>
                  </div>
                  
                  <div class="mb-3">
                    <label class="form-label">Untersucher:</label>
                      <textarea 
                        class="form-control"
                        v-model="editedPatient.examinersDisplay"
                      ></textarea>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Quelle der Daten:</label>
                      <textarea
                      class="form-control"
                      v-model="editedPatient.externalIdOrigin"
                    >
                    </textarea>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Zentrum:</label>
                      <textarea
                      class="form-control"
                      v-model="editedPatient.centerName"
                    >
                    </textarea>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Validierungs-Tags:</label>
                    <div class="d-flex flex-wrap gap-2 mb-2">
                      <button
                        v-for="tag in presetValidationTags"
                        :key="tag"
                        type="button"
                        class="btn btn-sm"
                        :class="selectedTags.includes(tag) ? 'btn-primary' : 'btn-outline-primary'"
                        @click="toggleValidationTag(tag)"
                      >
                        {{ tag }}
                      </button>
                    </div>
                    <div class="input-group mb-2">
                      <input
                        v-model="customTagInput"
                        type="text"
                        class="form-control"
                        placeholder="Eigenen Tag eingeben"
                        @keyup.enter="addCustomValidationTag"
                      >
                      <button
                        type="button"
                        class="btn btn-outline-secondary"
                        @click="addCustomValidationTag"
                      >
                        Tag hinzufügen
                      </button>
                    </div>
                    <div v-if="selectedTags.length" class="d-flex flex-wrap gap-2">
                      <span
                        v-for="tag in selectedTags"
                        :key="tag"
                        class="badge bg-secondary d-inline-flex align-items-center gap-1"
                      >
                        {{ tag }}
                        <button
                          type="button"
                          class="btn-close btn-close-white btn-close-sm"
                          aria-label="Tag entfernen"
                          @click="removeValidationTag(tag)"
                        ></button>
                      </span>
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Validierungsnotiz:</label>
                    <textarea
                      class="form-control"
                      rows="3"
                      v-model="validationComment"
                      placeholder="Freitext für Hinweise wie Nachkontrolle oder Ausschluss"
                    ></textarea>
                </div>
              </div>


              <!-- Annotation Section -->
              <div class="card bg-light">
                <div class="card-body">
                  <h5 class="card-title">Annotationen</h5>
                  <div v-if="processedUrl" class="mt-3">
                    <img :src="showOriginal ? originalUrl : processedUrl"
                         class="img-fluid" alt="Uploaded Image">
                    <button class="btn btn-info btn-sm mt-2" @click="toggleImage">
                      {{ showOriginal ? 'Bearbeitetes Bild anzeigen' : 'Original anzeigen' }}
                    </button>
                  </div>
                  <div class="mt-3">
                  </div>
                </div>
              </div>
            </div>
            </div>
            <!-- Media Viewer Section (PDF or Video) -->
            <div class="col-md-7">
              <div class="card">
                <div class="card-header pb-0">
                  <h5 class="mb-0">
                    {{ isPdf ? 'PDF Vorschau' : 'Video Vorschau' }}
                  </h5>
                  <!-- Clear Data Format Message -->
                  <div class="alert alert-info mt-2 mb-0">
                    <i class="ni ni-user-run me-2"></i>
                    <strong>Datenformat:</strong> 
                    <span v-if="isPdf">
                      PDF-Dokument ({{ Math.round((anonymizedPdfSrc?.length || 0) / 1024) || 'Nicht Verfügbar' }} KB)
                    </span>
                    <span v-else-if="isVideo">
                      Video-Datei (Raw: {{ rawVideoSrc || 'N/A' }} | Anonymized: {{ anonymizedVideoSrc || 'N/A' }})
                    </span>
                    <span v-else>
                      Unbekanntes Format - ID: {{ currentItem?.id }}
                    </span>
                  </div>
                </div>
                <div class="card-body media-viewer-container">
                  <!-- ✅ ENHANCED: Dual PDF Viewer for Raw vs Anonymized Comparison -->
                  <div v-if="isPdf" class="dual-pdf-container">
                    <div class="row">
                      <!-- Raw PDF (Original) -->
                      <div class="col-md-6">
                        <div class="pdf-section raw-pdf">
                          <h6 class="text-center mb-3 text-danger">
                            <i class="ni ni-single-copy-04 me-1"></i>
                            Original PDF (Raw)
                          </h6>
                          <iframe
                            :src="rawPdfSrc"
                            width="100%"
                            height="700px"
                            frameborder="0"
                            title="Original PDF Vorschau"
                          >
                            Ihr Browser unterstützt keine eingebetteten PDFs.
                          </iframe>
                          <div class="mt-2 text-center">
                            <a
                              v-if="rawPdfSrc"
                              class="btn btn-outline-danger btn-sm"
                              :href="rawPdfSrc"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Original-PDF öffnen
                            </a>
                          </div>
                          <div class="mt-2 text-center">
                            <small class="text-muted">
                              URL: {{ rawPdfSrc || 'Nicht verfügbar' }}
                            </small>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Anonymized PDF (Processed) -->
                      <div class="col-md-6">
                        <div class="pdf-section anonymized-pdf">
                          <h6 class="text-center mb-3 text-success">
                            <i class="ni ni-check-bold me-1"></i>
                            Anonymisiertes PDF (Processed)
                          </h6>
                          <iframe
                            :src="anonymizedPdfSrc"
                            width="100%"
                            height="700px"
                            frameborder="0"
                            title="Anonymisiertes PDF Vorschau"
                          >
                            Ihr Browser unterstützt keine eingebetteten PDFs.
                          </iframe>
                          <div class="mt-2 text-center">
                            <a
                              v-if="anonymizedPdfSrc"
                              class="btn btn-outline-success btn-sm"
                              :href="anonymizedPdfSrc"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Anonymisiertes PDF öffnen
                            </a>
                          </div>
                          <div class="mt-2 text-center">
                            <small class="text-muted">
                              URL: {{ anonymizedPdfSrc || 'Nicht verfügbar' }}
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- PDF Controls -->
                    <div class="pdf-controls mt-3 text-center">
                      <button 
                        class="btn btn-outline-primary btn-sm me-2"
                        @click="downloadRawPdf"
                      >
                        <i class="ni ni-cloud-upload-96 me-1"></i>
                        Original herunterladen
                      </button>
                      <button 
                        class="btn btn-outline-success btn-sm"
                        @click="downloadAnonymizedPdf"
                      >
                        <i class="ni ni-cloud-upload-96 me-1"></i>
                        Anonymisiert herunterladen
                      </button>
                    </div>
                  </div>
                  
                  <!-- ✅ ENHANCED: Dual Video Viewer for Raw vs Anonymized Comparison -->
                  <div v-else-if="isVideo" class="dual-video-container">
                    <div
                      class="alert mb-3"
                      :class="videoAnonymizationReady ? 'alert-warning' : 'alert-danger'"
                      role="status"
                    >
                      <div v-if="isLoadingVideoAnonymization" class="d-flex align-items-center gap-2">
                        <span class="spinner-border spinner-border-sm" role="status"></span>
                        Release-Artefakt wird geprüft...
                      </div>
                      <template v-else-if="videoAnonymizationStatus">
                        <div class="d-flex flex-wrap justify-content-between gap-2">
                          <div>
                            <strong>{{ videoStrategyLabel }}</strong>
                            <div class="small mt-1">
                              Modell: {{ videoModelDisplay }}<br>
                              Verfügbare OCR-Kaskade: {{ videoAnonymizationStatus.ocr_engines?.join(', ') || 'Nicht gemeldet' }}<br>
                              <span class="text-muted">
                                {{ videoAnonymizationStatus.selected_strategy === 'detector_assisted'
                                  ? 'OCR war nicht Bestandteil der All-Frame-Maskierung.'
                                  : 'OCR war nicht Bestandteil dieses Prozessorregion-Laufs.' }}
                              </span>
                            </div>
                          </div>
                          <div class="text-end">
                            <span class="badge" :class="videoAnonymizationStatus.processed_artifact.available ? 'bg-success' : 'bg-danger'">
                              {{ videoAnonymizationStatus.processed_artifact.available ? 'Anonymisierte Fassung verfügbar' : 'Kein anonymisiertes Artefakt' }}
                            </span>
                            <div class="small mt-1">
                              {{ videoAnonymizationStatus.review_required
                                ? 'Menschliche Prüfung und Freigabe erforderlich'
                                : 'Review-Anforderung fehlt' }}
                            </div>
                          </div>
                        </div>
                      </template>
                      <template v-else>
                        {{ videoAnonymizationError || 'Anonymisierungsstatus ist nicht verfügbar.' }}
                      </template>
                    </div>
                    <div class="row">
                      <!-- Raw Video (Original) -->
                      <div class="col-md-6">
                        <div class="video-section raw-video">
                          <h6 class="text-center mb-3 text-danger">
                            <i class="ni ni-user-run me-1"></i>
                            Original Video (Raw)
                          </h6>
                          <video
                            ref="rawVideoElement"
                            controls
                            style="width: 100%; max-height: 350px;"
                            preload="none"
                            @error="onRawVideoError"
                            @loadstart="onRawVideoLoadStart"
                            @canplay="onRawVideoCanPlay"
                            @timeupdate="(event) => syncVideoTime('raw', event)"
                          >
                            Ihr Browser unterstützt dieses Video-Format nicht.
                          </video>
                          <div
                            v-if="rawVideoPlaybackError"
                            class="alert alert-danger py-2 mt-2 mb-0"
                            role="alert"
                          >
                            {{ rawVideoPlaybackError.message }}
                          </div>
                          <div class="mt-2 text-center">
                            <small class="text-muted">
                              URL: {{ rawVideoPlaybackSourceUrl || rawVideoSrc || 'Nicht verfügbar' }}
                            </small>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Anonymized Video (Processed) -->
                      <div class="col-md-6">
                        <div class="video-section anonymized-video">
                          <h6 class="text-center mb-3 text-success">
                            <i class="ni ni-check-bold me-1"></i>
                            Anonymisiertes Video (Processed)
                          </h6>
                          <video
                            ref="anonymizedVideoElement"
                            controls
                            style="width: 100%; max-height: 350px;"
                            preload="none"
                            @error="onAnonymizedVideoError"
                            @loadstart="onAnonymizedVideoLoadStart"
                            @canplay="onAnonymizedVideoCanPlay"
                            @timeupdate="(event) => syncVideoTime('anonymized', event)"
                          >
                            Ihr Browser unterstützt dieses Video-Format nicht.
                          </video>
                          <div
                            v-if="anonymizedVideoPlaybackError"
                            class="alert alert-danger py-2 mt-2 mb-0"
                            role="alert"
                          >
                            {{ anonymizedVideoPlaybackError.message }}
                          </div>
                          <div class="mt-2 text-center">
                            <small class="text-muted">
                              URL: {{ anonymizedVideoPlaybackSourceUrl || anonymizedVideoSrc || 'Nicht verfügbar' }}
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Video Sync Controls -->
                    <div class="video-controls mt-3 text-center">
                      <button 
                        class="btn btn-outline-primary btn-sm me-2"
                        @click="syncVideos"
                      >
                        <i class="ni ni-bold-right me-1"></i>
                        Videos synchronisieren
                      </button>
                      <button 
                        class="btn btn-outline-secondary btn-sm"
                        @click="pauseAllVideos"
                      >
                        <i class="ni ni-button-play me-1"></i>
                        Alle pausieren
                      </button>
                      <button 
                        class="btn btn-outline-info btn-sm ms-2"
                        @click="validateVideoForSegmentAnnotation"
                        :disabled="isValidatingVideo"
                      >
                        <span v-if="isValidatingVideo" class="spinner-border spinner-border-sm me-1" role="status"></span>
                        <i v-else class="ni ni-check-bold me-1"></i>
                        Segment-Annotation prüfen
                      </button>
                      <RouterLink
                        class="btn btn-outline-danger btn-sm ms-2"
                        :to="phiRegionFrameAnnotationRoute"
                        data-test="phi-region-frame-annotation-link"
                      >
                        Patienteninformationen-Boxen annotieren
                      </RouterLink>
                    </div>
                    
                    <!-- Outside Timeline Component for Segment Validation -->
                    <div v-if="shouldShowOutsideTimeline && currentItem" class="outside-timeline-container mt-4">
                      <div class="card border-warning">
                        <div class="card-header bg-warning bg-opacity-10">
                          <div class="d-flex justify-content-between align-items-center">
                            <div>
                              <h6 class="mb-0 text-warning">
                                <i class="ni ni-user-run me-2"></i>
                                Segmente zur Entfernung - Video ID: {{ currentItem.id }}
                              </h6>
                              <small class="text-muted">
                                Diese Segmente wurden als "outside" klassifiziert und sollten aus dem Video entfernt werden.
                              </small>
                            </div>
                            <!-- Phase 3.1: Validation Progress Indicator -->
                            <div class="text-end">
                              <div class="badge bg-warning text-dark fs-6">
                                {{ outsideSegmentsValidated }} / {{ totalOutsideSegments }}
                              </div>
                              <div class="progress mt-2" style="width: 200px; height: 8px;">
                                <div 
                                  class="progress-bar bg-success" 
                                  role="progressbar" 
                                  :style="{ width: validationProgressPercent + '%' }"
                                  :aria-valuenow="outsideSegmentsValidated" 
                                  :aria-valuemin="0" 
                                  :aria-valuemax="totalOutsideSegments"
                                ></div>
                              </div>
                              <small class="text-muted">{{ validationProgressPercent }}% validiert</small>
                            </div>
                          </div>
                        </div>
                        <div class="card-body">
                          <OutsideTimelineComponent 
                            :videoId="currentItem.id"
                            @segment-validated="onSegmentValidated"
                            @validation-complete="onOutsideValidationComplete"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <!-- Video Validation Status -->
                    <div v-if="videoValidationStatus" class="alert mt-3" :class="videoValidationStatus.class">
                      <i :class="videoValidationStatus.icon" class="me-2"></i>
                      <strong>{{ videoValidationStatus.title }}:</strong>
                      {{ videoValidationStatus.message }}
                      <div v-if="videoValidationStatus.details" class="mt-2">
                        <small>{{ videoValidationStatus.details }}</small>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Debug Information - only when neither PDF nor video -->
                  <div v-else class="alert alert-warning">
                    <h6>Debug-Informationen:</h6>
                    <ul class="mb-0">
                      <li><strong>Current Item ID:</strong> {{ currentItem?.id || 'Nicht verfügbar' }}</li>
                      <li><strong>Is PDF:</strong> {{ isPdf }}</li>
                      <li><strong>Is Video:</strong> {{ isVideo }}</li>
                      <li><strong>Detected Media Type:</strong> {{ currentItem ? mediaStore.detectMediaType(currentItem as any) : 'N/A' }}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="row">
            <div class="col-12 d-flex justify-content-between">
              <button class="btn btn-secondary" @click="skipItem">
                Überspringen
              </button>
              <div class="d-flex gap-2">
                <!-- Correction Button - for videos and PDFs -->
                <button 
                  v-if="currentItem && (isVideo || isPdf)"
                  class="btn btn-warning position-relative" 
                  @click="navigateToCorrection"
                  :disabled="isApproving"
                  :title="isVideo ? 'Video-Korrektur: Maskierung, Frame-Entfernung, etc.' : 'PDF-Korrektur: Text-Annotation anpassen'"
                >
                  <i class="ni ni-single-copy-04 me-1"></i>
                  {{ isVideo ? 'Video-Korrektur' : 'PDF-Korrektur' }}
                  <!-- Unsaved changes indicator -->
                  <span 
                    v-if="dirty" 
                    class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                    style="font-size: 0.6em;"
                    title="Ungespeicherte Änderungen"
                  >
                    !
                  </span>
                </button>
                
                <button class="btn btn-danger me-2" @click="rejectItem">
                  Ablehnen
                </button>
                
                <button 
                  class="btn btn-success" 
                  @click="approveItem"
                  :disabled="isApproving || !canApprove"
                  :title="approvalBlockReason"
                >
                  <span v-if="isApproving" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {{ isApproving ? 'Wird bestätigt...' : 'Bestätigen' }}
                </button>
                <div class="alert alert-warning mt-2 mb-0" v-if="mediaUnknown">
                <strong>
                    Bitte hier den Medientyp eingeben - Der mediaStore hat einen Fehler
                </strong>
                <select v-model="mediaInferral">
                  <option v-for="mediaOption in mediaOptions" :value="mediaOption.value">
                    {{ mediaOption.text }}
                  </option>
                </select>
                </div>

                <!-- Phase 3.1: Show warning if approval blocked due to unvalidated segments -->
                <div v-if="!canApprove && approvalBlockReason" class="alert alert-warning mt-2 mb-0">
                  <i class="ni ni-user-run me-2"></i>
                  <strong>Bestätigung blockiert:</strong> {{ approvalBlockReason }}
                </div>
              </div>
            </div>
          </div>
                    <div class="row mb-4">
            <div class="col-12">
              <div class="card border-light-subtle shadow-sm">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
                    <div>
                      <h6 class="card-title mb-1">Fallzuordnung</h6>
                    </div>
                    <span class="badge" :class="linkageStatusBadgeClass">
                      {{ linkageStatusLabel }}
                    </span>
                  </div>

                  <div class="row g-3">
                    <div class="col-md-6">
                      <div class="linkage-meta-box">
                        <div class="linkage-meta-label">Pseudo-Patient</div>
                        <div class="linkage-meta-value">
                          {{ pseudoPatientDisplay }}
                        </div>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="linkage-meta-box">
                        <div class="linkage-meta-label">PatientExamination</div>
                        <div class="linkage-meta-value">
                          {{ patientExaminationDisplay }}
                        </div>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="linkage-meta-box">
                        <div class="linkage-meta-label">Medienstatus</div>
                        <div class="linkage-meta-value">
                          {{ linkageStatusDescription }}
                        </div>
                      </div>
                    </div>
                    <div v-if="isDebug" class="col-md-3">
                      <div class="linkage-meta-box">
                        <div class="linkage-meta-label">Patient Hash</div>
                        <div class="linkage-meta-value">
                          <code>{{ patientHashDisplay || 'Nicht verfuegbar' }}</code>
                        </div>
                      </div>
                    </div>
                    <div v-if="isDebug" class="col-md-3">
                      <div class="linkage-meta-box">
                        <div class="linkage-meta-label">Untersuchungs Hash</div>
                        <div class="linkage-meta-value">
                          <code>{{ examinationHashDisplay || 'Nicht verfuegbar' }}</code>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    v-if="linkageStatus !== 'linked'"
                    class="alert alert-secondary mt-3 mb-0"
                    role="alert"
                  >
                    <strong>Hinweis zur Fallzuordnung:</strong>
                    Diese Validierung kann auch ohne sofortige Fallzuordnung abgeschlossen werden.
                    Wenn Sie bereits jetzt eine minimale Untersuchung anlegen moechten, reicht in der Regel
                    eine Untersuchung wie <code>Koloskopie</code>. Befunde und weitere Details koennen spaeter
                    in der Befundung ergaenzt werden.
                    <div class="mt-2 d-flex flex-wrap gap-2">
                      <RouterLink
                        class="btn btn-outline-secondary btn-sm"
                        :to="caseResolutionRoute"
                      >
                        Fallauflösung öffnen
                      </RouterLink>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
</template>


<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAnonymizationStore, type SensitiveMeta } from '@/stores/anonymizationStore';
import {useVideoStore} from '@/stores/videoStore';
import { useToastStore } from '@/stores/toastStore';
import { useMediaTypeStore, type MediaScope } from '@/stores/mediaTypeStore';
import { useAuthKcStore } from '@/stores/auth_kc';
import OutsideTimelineComponent from '@/components/Anonymizer/OutsideSegmentComponent.vue';
import { DateConverter, DateValidator } from '@/utils/dateHelpers';
import { useAuthenticatedVideoStream } from '@/composables/useAuthenticatedVideoStream';
import { buildPdfStreamUrl, buildVideoHlsPlaylistUrl } from '@/utils/mediaUrls';
import {useRoute} from 'vue-router';
import { useDebug } from '@/composables/useDebug';

// @ts-ignore
import axiosInstance, { r } from '@/api/axiosInstance';
import { endpoints } from '@/types/api/endpoints';
import type { VideoAnonymizationStatus } from '@/types/anonymizationPipeline';


const toast = useToastStore();
const router = useRouter();
const { isDebug } = useDebug();
const ANONYMIZER_INFORMATION_SOURCE = 'lx_anonymizer_evaluation';
const PHI_REGION_LABEL_NAME = 'sensitive_region';

// Store references
const anonymizationStore = useAnonymizationStore();
const videoStore = useVideoStore();
const authStore = useAuthKcStore();
// const pdfStore = usePdfStore();
const mediaStore = useMediaTypeStore();

const route = useRoute();
const isPdf   = computed(() => mediaStore.isPdf);
const isVideo = computed(() => mediaStore.isVideo);
const canViewRawVideo = computed(() => authStore.isAuthenticated);

function restoreLast(): { fileId?: number; scope?: MediaScope } {
  const fid = Number(sessionStorage.getItem('last:fileId') || '');
  const sc  = sessionStorage.getItem('last:scope') as MediaScope | null;

  return {
    fileId: Number.isFinite(fid) ? fid : undefined,
    scope: sc || undefined,
  };
}
const props = defineProps<{
  fileId: number
  mediaType: string
}>();

let fileId = Number(props.fileId || route.query.fileId);
let scope  = (props.mediaType || route.query.mediaType) as MediaScope | undefined;
const sourceFileId = ref<number | null>(Number.isFinite(fileId) ? fileId : null);
const sourceMediaScope = ref<MediaScope | null>(
  scope === 'video' || scope === 'pdf' ? scope : null
);
const videoAnonymizationStatus = ref<VideoAnonymizationStatus | null>(null);
const isLoadingVideoAnonymization = ref(false);
const videoAnonymizationError = ref('');

const videoAnonymizationReady = computed(() =>
  videoAnonymizationStatus.value?.processed_artifact?.available === true &&
  videoAnonymizationStatus.value?.review_required === true
);

const videoStrategyLabel = computed(() =>
  videoAnonymizationStatus.value?.selected_strategy === 'processor_region'
    ? 'Prozessorregion (Legacy)'
    : 'PHI-Detektor-gestützte All-Frame-Anonymisierung'
);

const videoModelDisplay = computed(() => {
  const model = videoAnonymizationStatus.value?.model;
  if (!model) return 'Nicht gemeldet';
  const identity = [model.name, model.version].filter(Boolean).join(' ');
  const checksum = model.sha256 ? `SHA-256 ${model.sha256.slice(0, 12)}…` : '';
  return [identity, checksum].filter(Boolean).join(' · ') || 'Nicht gemeldet';
});


console.log("fileid and scope", fileId, scope)
if (!Number.isFinite(fileId) || !scope) {
  const restored = restoreLast();
  if (restored.fileId !== undefined) fileId = restored.fileId;
  if (restored.scope) scope = restored.scope;
  if (restored.scope === 'video' || restored.scope === 'pdf') {
    sourceMediaScope.value = restored.scope;
  }
}

if (!Number.isFinite(fileId) || !scope) {
  console.error('Validation view: cannot determine fileId/scope; aborting mediaStore init.', { fileId, scope });
} else {
  mediaStore.setCurrentByKey(scope, fileId);
  sourceFileId.value = fileId;
  sourceMediaScope.value = scope;
}

const mediaOptions = [
  { text: 'Video', value: 'video' },
  { text: 'PDF',   value: 'pdf' },
] as const;

const mediaInferral = ref<'video' | 'pdf' | ''>('');

const mediaUnknown = computed(
  () => !isPdf.value && !isVideo.value
);

watch(mediaInferral, (val) => {
  if (!val || !currentItem.value) return;

  // Remember this type for the current file, both as type and scope
  mediaStore.rememberType(currentItem.value.id, val, val);
  mediaStore.setCurrentByKey(val, currentItem.value.id);
  sourceMediaScope.value = val;
});


type DocumentTypeOption = {
  value: string;
  label: string;
};

type PatientExaminationOption = {
  id: number;
  label: string;
};

type CaseResolutionMatch = {
  id: number;
  patientId?: number | null;
  examinationName?: string | null;
  dateStart?: string | null;
  dateEnd?: string | null;
  hash?: string | null;
};

type CaseResolutionPayload = {
  mediaType: 'pdf' | 'video';
  mediaId: number;
  sensitiveMetaId: number;
  linkedPatientExaminationId?: number | null;
  isAutoResolved?: boolean | null;
  patientHashDisplay?: string | null;
  examinationHashDisplay?: string | null;
  pseudoPatient?: {
    id?: number | null;
    matchCount?: number | null;
  } | null;
  pseudoExamination?: {
    id?: number | null;
    linkedPatientExaminationId?: number | null;
  } | null;
  matchStatus?: 'linked' | 'deferred' | 'suggested' | 'unresolved' | string | null;
  suggestedMatchCount?: number | null;
  recommendedPatientExaminationId?: number | null;
  patientExaminationMatches?: CaseResolutionMatch[];
};

type NoMoreNamesConfirmation = 'unknown' | 'confirmed' | 'not_confirmed';

interface AnonymizationValidationPayload {
  patient_first_name?: string | null;
  patient_last_name?: string | null;
  patient_gender?: string | null;
  patient_dob?: string;
  examination_date?: string;
  casenumber?: string;
  anonymized_text?: string;
  text?: string;
  is_verified: 'true';
  file_type: 'pdf' | 'video';
  center_name?: string;
  external_id?: string;
  external_id_origin?: string;
  tags: string[];
  validation_comment?: string;
  document_type?: string;
  no_more_names_confirmed?: boolean;
}

// Local state
const editedAnonymizedText = ref('');
const examinationDate = ref('');
const noMoreNamesConfirmation = ref<NoMoreNamesConfirmation>('unknown');
const presetValidationTags = ['Nochmal Überprüfen', 'Ausgeschlossen'];
const selectedTags = ref<string[]>([]);
const customTagInput = ref('');
const validationComment = ref('');
const caseResolution = ref<CaseResolutionPayload | null>(null);
const documentTypeOptions = ref<DocumentTypeOption[]>([]);
const selectedDocumentType = ref('');
const isLoadingDocumentTypes = ref(false);
const documentTypeLoadError = ref('');
const documentTypeTouched = ref(false);
const patientExaminationOptions = ref<PatientExaminationOption[]>([]);
const selectedPatientExaminationOption = ref('');
const manualPatientExaminationId = ref('');
const isLoadingPatientExaminations = ref(false);
const patientExaminationLoadError = ref('');
const editedPatient = ref<Editable>({
  patientFirstName: '',
  patientLastName: '',
  patientGenderName: '',
  patientDob: '',
  casenumber: '',
  externalId: '',
  externalIdOrigin: '',
  centerName: '',
  text: '',
  anonymizedText: '',
  examinersDisplay: '',
  examinationDate: '',
});

// ✨ Phase 2.2: Validation error tracking
const validationErrors = ref<string[]>([]);
const dobErrorMessage = ref<string>('');
const examDateErrorMessage = ref<string>('');
const dobDisplayFormat = ref<string>('');
const examDateDisplayFormat = ref<string>('');

// ✅ NEW: Video validation state for segment annotation
const isValidatingVideo = ref(false);
const shouldShowOutsideTimeline = ref(false);
const videoValidationStatus = ref<{
  class: string;
  icon: string;
  title: string;
  message: string;
  details?: string;
} | null>(null);
const outsideSegmentsValidated = ref(0);
const totalOutsideSegments = ref(0);

// Upload-related state
const originalUrl = ref('');
const processedUrl = ref('');
const showOriginal = ref(false);
const hasSuccessfulUpload = ref(false);



// Original state for dirty tracking

type Editable = {
  patientFirstName: string;
  patientLastName: string;
  patientGenderName: string;
  patientDob: string; 
  casenumber: string;
  externalId?: string;
  externalIdOrigin?: string;
  centerName?: string;
  text?: string;
  anonymizedText?: string;
  examinersDisplay?: string;
  examinationDate?: string;
};

const original = ref<{
  anonymizedText: string;
  examinationDate: string; // raw as shown in UI
  tags: string[];
  validationComment: string;
  patient: Editable;
}>({
  anonymizedText: '',
  examinationDate: '',
  tags: [],
  validationComment: '',
  patient: {
    patientFirstName: '',
    patientLastName: '',
    patientGenderName: '',
    patientDob: '',
    casenumber: '',
  },
});


function shallowEqual(a: Editable, b: Editable): boolean {
  return a.patientFirstName === b.patientFirstName &&
         a.patientLastName === b.patientLastName &&
         a.patientGenderName === b.patientGenderName &&
         a.patientDob === b.patientDob &&
         a.casenumber === b.casenumber;
}

function normalizeValidationTag(tag: string): string {
  return tag.trim().replace(/\s+/g, ' ');
}

function areSortedStringArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function addValidationTag(tag: string): void {
  const normalizedTag = normalizeValidationTag(tag);
  if (!normalizedTag) return;
  const hasTag = selectedTags.value.some(
    (entry) => entry.localeCompare(normalizedTag, undefined, { sensitivity: 'base' }) === 0
  );
  if (hasTag) return;
  selectedTags.value = [...selectedTags.value, normalizedTag].sort((a, b) => a.localeCompare(b));
}

function toggleValidationTag(tag: string): void {
  const normalizedTag = normalizeValidationTag(tag);
  const existingIndex = selectedTags.value.findIndex(
    (entry) => entry.localeCompare(normalizedTag, undefined, { sensitivity: 'base' }) === 0
  );
  if (existingIndex >= 0) {
    selectedTags.value = selectedTags.value.filter((_, index) => index !== existingIndex);
    return;
  }
  addValidationTag(normalizedTag);
}

function removeValidationTag(tag: string): void {
  selectedTags.value = selectedTags.value.filter(
    (entry) => entry.localeCompare(tag, undefined, { sensitivity: 'base' }) !== 0
  );
}

function addCustomValidationTag(): void {
  addValidationTag(customTagInput.value);
  customTagInput.value = '';
}

// --- add below your imports/locals ---

// ============================================================================
// DATE CONVERSION UTILITIES - Using centralized DateConverter (Phase 2.1)
// ============================================================================
// Legacy functions removed - now using DateConverter from @/utils/dateHelpers
// Migration: Oct 2025 (Phase 2.1)

function normalizeDateInputToGerman(value?: string | null): string {
  const isoDate = DateConverter.toISO(value);
  if (!isoDate) return '';
  return DateConverter.toGerman(isoDate);
}

function buildSensitiveMetaSnake(dobGerman: string) {
  return {
    patient_first_name: editedPatient.value.patientFirstName || '',
    patient_last_name:  editedPatient.value.patientLastName  || '',
    patient_gender:     editedPatient.value.patientGenderName    || '',
    patient_dob:        dobGerman,  // 🎯 Jetzt deutsches Format
    casenumber:         editedPatient.value.casenumber       || '',
  };
}

// ============================================================================
// COMPUTED PROPERTIES - Validation
// ============================================================================
const firstNameOk = computed(() => editedPatient.value.patientFirstName.trim().length > 0);
const lastNameOk  = computed(() => editedPatient.value.patientLastName.trim().length  > 0);

// ✨ Phase 2.1: Using centralized DateConverter
const dobISO  = computed(() => DateConverter.toISO(editedPatient.value.patientDob));
const examISO = computed(() => DateConverter.toISO(examinationDate.value));

// ✨ Phase 2.2: Validation error summary
const validationErrorSummary = computed(() => {
  const count = validationErrors.value.length;
  if (count === 0) return 'Alle Felder sind gültig';
  if (count === 1) return '1 Validierungsfehler gefunden';
  return `${count} Validierungsfehler gefunden`;
});

// DOB must be present & valid
const isDobValid = computed(() => !!dobISO.value);

// Exam optional; if present requires valid DOB and must be >= DOB
const isExaminationDateValid = computed(() => {
  if (!examISO.value) return true;
  if (!dobISO.value)  return false;
  return DateConverter.isAfterOrEqual(examISO.value, dobISO.value);
});

// Global save gates
const dataOk = computed(() =>
  firstNameOk.value && lastNameOk.value && isDobValid.value && isExaminationDateValid.value
);

const hasValidDocumentType = computed(() => {
  if (!isPdf.value) return true;
  return documentTypeOptions.value.some((option) => option.value === selectedDocumentType.value);
});

const selectedPatientExaminationIdForRouting = computed(() => {
  if (!isPdf.value) return null;
  if (selectedPatientExaminationOption.value === '__manual__') {
    return toPositiveInteger(manualPatientExaminationId.value);
  }
  return toPositiveInteger(selectedPatientExaminationOption.value);
});

const hasValidPatientExaminationSelection = computed(() => {
  if (!isPdf.value) return true;
  if (selectedPatientExaminationOption.value !== '__manual__') return true;
  return selectedPatientExaminationIdForRouting.value !== null;
});

const canSubmit = computed(() => {
  // For annotation saving, we need both uploaded images AND valid patient data
  return dataOk.value;
});

// ============================================================================
// Phase 3.1: Segment Validation Enforcement
// ============================================================================

/**
 * Determines if approval is allowed based on validation state.
 * Blocks approval if video has unvalidated outside segments.
 */
const canApprove = computed(() => {
  // Basic data validation must pass
  if (!dataOk.value) return false;

  // PDFs require an explicit document type
  if (!hasValidDocumentType.value) return false;

  // Manual patient examination selection must be valid if used
  if (!hasValidPatientExaminationSelection.value) return false;

  // Video approval is fail-closed until the canonical processed artifact is
  // available and explicitly marked for mandatory human review.
  if (isVideo.value && !videoAnonymizationReady.value) return false;
  
  // For videos: Check if outside segments need validation
  if (isVideo.value && shouldShowOutsideTimeline.value) {
    // Block approval until all outside segments are validated
    return false;
  }
  
  // All checks passed
  return true;
});

/**
 * Returns a user-friendly message explaining why approval is blocked.
 */
const approvalBlockReason = computed(() => {
  if (!dataOk.value) {
    const errors = [];
    if (!firstNameOk.value) errors.push('Vorname');
    if (!lastNameOk.value) errors.push('Nachname');
    if (!isDobValid.value) errors.push('gültiges Geburtsdatum');
    if (!isExaminationDateValid.value) errors.push('gültiges Untersuchungsdatum');
    return `Bitte korrigieren Sie: ${errors.join(', ')}`;
  }

  if (!hasValidDocumentType.value) {
    return 'Bitte wählen Sie einen Dokumenttyp für die PDF-Validierung.';
  }

  if (!hasValidPatientExaminationSelection.value) {
    return 'Bitte geben Sie eine gültige PatientExamination-ID ein oder wählen Sie "Automatisch bestimmen".';
  }

  if (isVideo.value && isLoadingVideoAnonymization.value) {
    return 'Das anonymisierte Release-Artefakt wird noch geprüft.';
  }

  if (isVideo.value && !videoAnonymizationStatus.value) {
    return videoAnonymizationError.value || 'Der Anonymisierungsstatus konnte nicht geprüft werden.';
  }

  if (isVideo.value && !videoAnonymizationStatus.value?.processed_artifact.available) {
    return 'Es ist noch keine anonymisierte Video-Fassung verfügbar.';
  }

  if (isVideo.value && !videoAnonymizationStatus.value?.review_required) {
    return 'Das Artefakt ist nicht als verpflichtend menschlich zu prüfende Fassung gekennzeichnet.';
  }
  
  if (isVideo.value && shouldShowOutsideTimeline.value) {
    const remaining = totalOutsideSegments.value - outsideSegmentsValidated.value;
    return `Bitte validieren Sie zuerst alle Outside-Segmente (${remaining} verbleibend)`;
  }
  
  return '';
});

/**
 * Calculates validation progress percentage for progress bar.
 */
const validationProgressPercent = computed(() => {
  if (totalOutsideSegments.value === 0) return 0;
  return Math.round((outsideSegmentsValidated.value / totalOutsideSegments.value) * 100);
});

// ============================================================================
// End Phase 3.1
// ============================================================================


// Computed
const currentItem = computed(() => anonymizationStore.current);
const currentFileIdLabel = computed(() => {
  const targetFileId = resolveFileIdFromContext();
  if (targetFileId === null) return '';

  if (sourceMediaScope.value === 'video') return `Video-ID: ${targetFileId}`;
  if (sourceMediaScope.value === 'pdf') return `PDF-ID: ${targetFileId}`;
  return `Datei-ID: ${targetFileId}`;
});

const patientHashDisplay = computed(
  () => caseResolution.value?.patientHashDisplay ?? currentItem.value?.patientHashDisplay ?? null
);
const examinationHashDisplay = computed(
  () => caseResolution.value?.examinationHashDisplay ?? currentItem.value?.examinationHashDisplay ?? null
);
const pseudoPatientId = computed(() => {
  const value =
    caseResolution.value?.pseudoPatient?.id ??
    currentItem.value?.pseudoPatientId ??
    currentItem.value?.patientId ??
    null;
  return typeof value === 'number' && value > 0 ? value : null;
});
const linkedPatientExaminationId = computed(() => {
  const value =
    caseResolution.value?.pseudoExamination?.linkedPatientExaminationId ??
    currentItem.value?.patientExaminationId ??
    caseResolution.value?.recommendedPatientExaminationId ??
    currentItem.value?.pseudoExaminationId ??
    null;
  return typeof value === 'number' && value > 0 ? value : null;
});
const linkageStatus = computed<'not_linked' | 'suggested' | 'linked' | 'deferred'>(() => {
  if (caseResolution.value?.matchStatus === 'linked') {
    return 'linked';
  }
  if (caseResolution.value?.matchStatus === 'deferred') {
    return 'deferred';
  }
  if (caseResolution.value?.matchStatus === 'suggested') {
    return 'suggested';
  }
  if (caseResolution.value?.matchStatus === 'unresolved') {
    return 'not_linked';
  }
  if (
    caseResolution.value?.pseudoExamination?.linkedPatientExaminationId ||
    currentItem.value?.patientExaminationId
  ) {
    return 'linked';
  }
  if (patientHashDisplay.value || examinationHashDisplay.value || pseudoPatientId.value !== null) {
    return 'suggested';
  }
  return 'not_linked';
});
const linkageStatusLabel = computed(() => {
  const labels = {
    not_linked: 'Nicht verknuepft',
    suggested: 'Vorgeschlagen',
    linked: 'Verknuepft',
    deferred: 'Zurueckgestellt'
  } as const;
  return labels[linkageStatus.value];
});
const linkageStatusDescription = computed(() => {
  if (linkageStatus.value === 'linked') {
    if (caseResolution.value?.isAutoResolved) {
      return 'Der Patientenfall wurde automatisch aus den validierten Metadaten zugeordnet.';
    }
    return 'Eine bestehende Fallverknuepfung ist bereits vorhanden.';
  }
  if (linkageStatus.value === 'deferred') {
    return 'Die Fallzuordnung wurde bewusst vertagt und kann spaeter abgeschlossen werden.';
  }
  if (
    caseResolution.value?.matchStatus === 'suggested' &&
    (caseResolution.value?.suggestedMatchCount ?? 0) > 1
  ) {
    return 'Mehrere passende PatientExaminations wurden gefunden. Eine explizite Auswahl ist spaeter erforderlich.';
  }
  if (
    caseResolution.value?.matchStatus === 'suggested' &&
    (caseResolution.value?.suggestedMatchCount ?? 0) === 1
  ) {
    return 'Eine passende PatientExamination wurde vorgeschlagen, ist aber noch nicht final bestaetigt.';
  }
  if (linkageStatus.value === 'suggested') {
    return 'Hash- oder Pseudo-Patient-Hinweise sind vorhanden, die Zuordnung ist aber noch nicht final.';
  }
  return 'Derzeit liegt noch keine erkennbare Fallverknuepfung vor.';
});
const linkageStatusBadgeClass = computed(() => {
  const classes = {
    not_linked: 'bg-secondary',
    suggested: 'bg-warning text-dark',
    linked: 'bg-success',
    deferred: 'bg-info text-dark'
  } as const;
  return classes[linkageStatus.value];
});
const pseudoPatientDisplay = computed(() => {
  if (pseudoPatientId.value !== null) {
    const matchCount = caseResolution.value?.pseudoPatient?.matchCount;
    return typeof matchCount === 'number' && matchCount > 0
      ? `#${pseudoPatientId.value} (${matchCount} Treffer)`
      : `#${pseudoPatientId.value}`;
  }
  return 'Nicht verknuepft';
});
const patientExaminationDisplay = computed(() => {
  if (linkedPatientExaminationId.value !== null) {
    return `#${linkedPatientExaminationId.value}`;
  }
  const suggestedId = caseResolution.value?.recommendedPatientExaminationId;
  if (typeof suggestedId === 'number' && suggestedId > 0) {
    return `Vorschlag: #${suggestedId}`;
  }
  return 'Noch keine Zuordnung';
});
const caseResolutionRoute = computed(() => {
  const targetFileId = resolveFileIdFromContext();
  const targetScope = sourceMediaScope.value;
  const query: Record<string, string> = {
    preferredExamination: 'colonoscopy'
  };

  if (targetFileId !== null && targetScope) {
    query.returnTo = `/anonymisierung/validierung?fileId=${targetFileId}&mediaType=${targetScope}`;
  } else {
    query.returnTo = '/anonymisierung/validierung';
  }

  return {
    path: '/reporting/case-resolution',
    query
  };
});

const phiRegionFrameAnnotationRoute = computed(() => {
  const targetFileId = resolveFileIdFromContext();
  const targetScope = sourceMediaScope.value;
  const query: Record<string, string> = {
    mode: 'phi_region',
    taskMode: 'random',
    targetLabel: PHI_REGION_LABEL_NAME,
    informationSource: ANONYMIZER_INFORMATION_SOURCE,
    returnTo: '/anonymisierung/validierung'
  };

  if (targetFileId !== null) {
    query.fileId = String(targetFileId);
  }
  if (targetScope) {
    query.mediaType = targetScope;
  }
  if (targetFileId !== null && targetScope) {
    query.returnTo = `/anonymisierung/validierung?fileId=${targetFileId}&mediaType=${targetScope}`;
  }

  return {
    path: '/frame-annotation',
    query
  };
});

async function fetchCaseResolution(): Promise<void> {
  const targetFileId = resolveFileIdFromContext();
  const targetScope = sourceMediaScope.value;

  caseResolution.value = null;
  if (targetFileId === null || !targetScope) {
    return;
  }

  const endpoint =
    targetScope === 'pdf'
      ? endpoints.media.pdfCaseResolution(targetFileId)
      : endpoints.media.videoCaseResolution(targetFileId);

  try {
    const { data } = await axiosInstance.get<CaseResolutionPayload>(r(endpoint));
    caseResolution.value = data;
  } catch (error) {
    console.warn('Case resolution lookup failed; falling back to sensitive metadata payload.', error);
  }
}

async function fetchVideoAnonymizationStatus(): Promise<void> {
  videoAnonymizationStatus.value = null;
  videoAnonymizationError.value = '';
  if (!isVideo.value) return;

  const targetFileId = resolveFileIdFromContext();
  if (targetFileId === null) {
    videoAnonymizationError.value = 'Video-ID konnte nicht bestimmt werden.';
    return;
  }

  isLoadingVideoAnonymization.value = true;
  try {
    const { data } = await axiosInstance.get<VideoAnonymizationStatus>(
      r(endpoints.media.videoCorrectionAnonymization(targetFileId))
    );
    videoAnonymizationStatus.value = data;
  } catch (error: any) {
    videoAnonymizationError.value =
      error?.response?.data?.error ||
      error?.message ||
      'Release-Artefakt konnte nicht geprüft werden.';
  } finally {
    isLoadingVideoAnonymization.value = false;
  }
}

async function initializeCurrentItemFromRouteContext(): Promise<boolean> {
  const targetFileId = resolveFileIdFromContext();
  const targetScope = sourceMediaScope.value;

  if (targetFileId === null || !targetScope) {
    return false;
  }

  if (!anonymizationStore.overview.length) {
    await anonymizationStore.fetchOverview();
  }

  const loaded = await anonymizationStore.setCurrentForValidation(
    targetFileId,
    targetScope
  );

  return !!loaded;
}

// ✅ NEW: Raw video URL (original unprocessed video)
const rawVideoSrc = computed(() => {
  if (!isVideo.value || !currentItem.value || !canViewRawVideo.value) return undefined;
  const targetFileId = sourceFileId.value;
  return targetFileId === null ? undefined : buildVideoHlsPlaylistUrl(targetFileId, 'raw');
});

// ✅ NEW: Anonymized video URL (processed/anonymized video)
const anonymizedVideoSrc = computed(() => {
  if (!isVideo.value || !currentItem.value) return undefined;
  const targetFileId = sourceFileId.value;
  return targetFileId === null ? undefined : buildVideoHlsPlaylistUrl(targetFileId, 'processed');
});

// ✅ NEW: Raw PDF URL (original unprocessed PDF)
const rawPdfSrc = computed(() => {
  if (!isPdf.value || !currentItem.value) return undefined;
  return buildPdfStreamUrl(fileId, 'raw');
});

// ✅ NEW: Anonymized PDF URL (processed/anonymized PDF)
const anonymizedPdfSrc = computed(() => {
  if (!isPdf.value || !currentItem.value) return undefined;
  return buildPdfStreamUrl(fileId, 'processed');
});

const rawPdfDownloadSrc = computed(() => {
  if (!isPdf.value || !currentItem.value) return undefined;
  return buildPdfStreamUrl(fileId, 'raw', { download: 1 });
});

const anonymizedPdfDownloadSrc = computed(() => {
  if (!isPdf.value || !currentItem.value) return undefined;
  return buildPdfStreamUrl(fileId, 'processed', { download: 1 });
});


// ✅ NEW: Refs for dual video elements
const rawVideoElement = ref<HTMLVideoElement | null>(null);
const anonymizedVideoElement = ref<HTMLVideoElement | null>(null);
const validationVideoId = computed(() => isVideo.value ? sourceFileId.value : null);

const {
  playbackError: rawVideoPlaybackError,
  playbackSourceUrl: rawVideoPlaybackSourceUrl
} = useAuthenticatedVideoStream({
  videoElement: rawVideoElement,
  videoId: validationVideoId,
  artifactKind: 'raw',
  enabled: computed(() => isVideo.value && canViewRawVideo.value)
});

const {
  playbackError: anonymizedVideoPlaybackError,
  playbackSourceUrl: anonymizedVideoPlaybackSourceUrl
} = useAuthenticatedVideoStream({
  videoElement: anonymizedVideoElement,
  videoId: validationVideoId,
  artifactKind: 'processed',
  enabled: isVideo
});

// ✅ NEW: Video event handlers for raw video
const onRawVideoError = (event: Event) => {
  console.error('Raw video error:', event);
  // Handle raw video errors gracefully
};

const onRawVideoLoadStart = () => {
  console.log('Raw video load started');
};

const onRawVideoCanPlay = () => {
  console.log('Raw video can play');
};

// ✅ NEW: Video event handlers for anonymized video
const onAnonymizedVideoError = (event: Event) => {
  console.error('Anonymized video error:', event);
  // Handle anonymized video errors gracefully
};

const onAnonymizedVideoLoadStart = () => {
  console.log('Anonymized video load started');
};

const onAnonymizedVideoCanPlay = () => {
  console.log('Anonymized video can play');
};

// ✅ NEW: Video synchronization functions
const syncVideoTime = (source: 'raw' | 'anonymized', event: Event) => {
  if (!rawVideoElement.value || !anonymizedVideoElement.value) return;
  
  const sourceElement = source === 'raw' ? rawVideoElement.value : anonymizedVideoElement.value;
  const targetElement = source === 'raw' ? anonymizedVideoElement.value : rawVideoElement.value;
  
  // Sync time only if there's a significant difference (avoid infinite loops)
  const timeDiff = Math.abs(sourceElement.currentTime - targetElement.currentTime);
  if (timeDiff > 0.5) { // 0.5 second tolerance
    targetElement.currentTime = sourceElement.currentTime;
  }
};

const syncVideos = () => {
  if (!rawVideoElement.value || !anonymizedVideoElement.value) return;
  
  // Sync to the average time of both videos
  const avgTime = (rawVideoElement.value.currentTime + anonymizedVideoElement.value.currentTime) / 2;
  rawVideoElement.value.currentTime = avgTime;
  anonymizedVideoElement.value.currentTime = avgTime;
  
  console.log('Videos synchronized to time:', avgTime);
};

const pauseAllVideos = () => {
  if (rawVideoElement.value) rawVideoElement.value.pause();
  if (anonymizedVideoElement.value) anonymizedVideoElement.value.pause();
  console.log('All videos paused');
};

const downloadRawPdf = () => {
  if (!rawPdfDownloadSrc.value) {
    toast.warning({ text: 'Original-PDF nicht verfügbar.' });
    return;
  }

  window.open(rawPdfDownloadSrc.value, '_blank');
  console.log('Downloading raw PDF:', rawPdfDownloadSrc.value);
};

const downloadAnonymizedPdf = () => {
  if (!anonymizedPdfDownloadSrc.value) {
    toast.warning({ text: 'Anonymisiertes PDF nicht verfügbar.' });
    return;
  }

  window.open(anonymizedPdfDownloadSrc.value, '_blank');
  console.log('Downloading anonymized PDF:', anonymizedPdfDownloadSrc.value);
};

const validateVideoForSegmentAnnotation = async () => {
  if (!currentItem.value || !isVideo.value) {
    toast.warning({ text: 'Kein Video zur Validierung ausgewählt.' });
    return;
  }

  isValidatingVideo.value = true;
  shouldShowOutsideTimeline.value = false;
  videoValidationStatus.value = null;

  try {
    console.log(`🔍 Validating video ${currentItem.value.id} for segment annotation...`);

    await videoStore.fetchAllSegments(currentItem.value.id, true);
    const outsideSegments = videoStore.allSegments.filter(
      (segment) =>
        segment.videoID === currentItem.value?.id && segment.label === 'outside'
    );

    totalOutsideSegments.value = outsideSegments.length;
    outsideSegmentsValidated.value = 0;

    if (outsideSegments.length > 0) {
      shouldShowOutsideTimeline.value = true;
      videoValidationStatus.value = {
        class: 'alert-warning',
        icon: 'ni ni-user-run',
        title: 'Segmentvalidierung erforderlich',
        message: `${outsideSegments.length} "Outside"-Segmente gefunden, die validiert werden müssen.`,
        details: 'Verwenden Sie die Timeline unten, um die Segmente zu überprüfen und zu bestätigen.'
      };
    } else {
      videoValidationStatus.value = {
        class: 'alert-success',
        icon: 'ni ni-check-bold',
        title: 'Video bereit für Annotation',
        message: 'Keine "Outside"-Segmente gefunden. Video ist bereit für die Segment-Annotation.',
        details: `Video ID: ${currentItem.value.id} - Alle Validierungen bestanden.`
      };
    }

    toast.info({ text: `Video ${currentItem.value.id} validiert` });
  } catch (error: any) {
    console.error('Error validating video for segment annotation:', error);
    videoValidationStatus.value = {
      class: 'alert-danger',
      icon: 'ni ni-settings-gear-65',
      title: 'Validierung fehlgeschlagen',
      message: 'Video konnte nicht für Segment-Annotation validiert werden.',
      details: error?.response?.data?.detail || error?.message || 'Unbekannter Fehler'
    };
  } finally {
    isValidatingVideo.value = false;
  }
};

const onSegmentValidated = (segmentId: string | number) => {
  outsideSegmentsValidated.value++;
  console.log(`✅ Segment ${segmentId} validated. Progress: ${outsideSegmentsValidated.value}/${totalOutsideSegments.value}`);
  
  // Update validation status
  if (videoValidationStatus.value) {
    videoValidationStatus.value.message = 
      `Fortschritt: ${outsideSegmentsValidated.value}/${totalOutsideSegments.value} Outside-Segmente validiert.`;
  }
};

const onOutsideValidationComplete = () => {
  console.log('🎉 All outside segments validated!');
  shouldShowOutsideTimeline.value = false;
  
  videoValidationStatus.value = {
    class: 'alert-success',
    icon: 'ni ni-check-bold',
    title: 'Validierung abgeschlossen',
    message: 'Alle Outside-Segmente wurden erfolgreich validiert.',
    details: `Video ${currentItem.value?.id} ist jetzt bereit für die vollständige Segment-Annotation.`
  };
  
  toast.success({ text: 'Outside-Segment Validierung abgeschlossen!' });
};

function convertGender(gender: string | undefined) {
  if (gender == undefined) {
    return 'unknown'
  }
  if (['male', 'männlich', 'm'].includes(gender)) {
    return "male";
  } else if (['female', 'weiblich', 'f', 'w'].includes(gender)) {
    return "female";
  } else if (['other', 'divers', 'd'].includes(gender)) {
    return "unknown"; // #TODO Change to diverse gender once supportec
  }
  return gender;
}

function normalizeDocumentTypeOptions(raw: unknown): DocumentTypeOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (typeof entry === 'string') {
        return { value: entry, label: entry };
      }
      if (
        entry &&
        typeof entry === 'object' &&
        typeof (entry as { value?: unknown }).value === 'string' &&
        typeof (entry as { label?: unknown }).label === 'string'
      ) {
        return {
          value: (entry as { value: string }).value,
          label: (entry as { label: string }).label,
        };
      }
      return null;
    })
    .filter((entry): entry is DocumentTypeOption => entry !== null);
}

async function fetchDocumentTypeOptions(): Promise<void> {
  if (isLoadingDocumentTypes.value) return;
  isLoadingDocumentTypes.value = true;
  documentTypeLoadError.value = '';

  try {
    const response = await axiosInstance.get(r(endpoints.anonymization.documentTypesDropdown));
    const options = normalizeDocumentTypeOptions(response.data);
    documentTypeOptions.value = options;
    if (!options.some((option) => option.value === selectedDocumentType.value)) {
      selectedDocumentType.value = '';
    }
  } catch (error: any) {
    console.error('Error loading document type options:', error);
    documentTypeOptions.value = [];
    documentTypeLoadError.value =
      error?.response?.data?.error ||
      error?.message ||
      'Dokumenttypen konnten nicht geladen werden.';
  } finally {
    isLoadingDocumentTypes.value = false;
  }
}

function normalizePatientExaminationOption(raw: unknown): PatientExaminationOption | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = toPositiveInteger(row.id);
  if (id === null) return null;

  const examinationName =
    (typeof row.examination_name === 'string' && row.examination_name.trim()) ||
    (typeof row.examination === 'string' && row.examination.trim()) ||
    'Untersuchung';
  const dateStartRaw = typeof row.date_start === 'string' ? row.date_start : '';
  const dateStart = dateStartRaw ? dateStartRaw.split('T')[0] : '';

  return {
    id,
    label: dateStart
      ? `#${id} · ${examinationName} · ${dateStart}`
      : `#${id} · ${examinationName}`,
  };
}

function addOrReplacePatientExaminationOption(
  target: PatientExaminationOption[],
  option: PatientExaminationOption
): void {
  const existingIndex = target.findIndex((entry) => entry.id === option.id);
  if (existingIndex >= 0) {
    target[existingIndex] = option;
    return;
  }
  target.push(option);
}

async function fetchPatientExaminationOptions(): Promise<void> {
  if (!isPdf.value) {
    patientExaminationOptions.value = [];
    patientExaminationLoadError.value = '';
    return;
  }

  if (isLoadingPatientExaminations.value) return;
  isLoadingPatientExaminations.value = true;
  patientExaminationLoadError.value = '';

  const options: PatientExaminationOption[] = [];
  const pdfFileId = sourceFileId.value;
  if (pdfFileId === null) {
    patientExaminationOptions.value = options;
    patientExaminationLoadError.value =
      'Datei-ID für die Untersuchungsauswahl konnte nicht bestimmt werden.';
    isLoadingPatientExaminations.value = false;
    return;
  }

  try {
    const pdfDetailResponse = await axiosInstance.get(r(endpoints.media.pdfDetail(pdfFileId)));
    const pdfDetail = pdfDetailResponse?.data;

    const suggestedPatientExaminationId =
      extractPatientExaminationId(pdfDetail) ??
      extractPatientExaminationId(currentItem.value);
    if (suggestedPatientExaminationId !== null) {
      addOrReplacePatientExaminationOption(options, {
        id: suggestedPatientExaminationId,
        label: `#${suggestedPatientExaminationId} · Bereits zugeordnet`,
      });
    }

    const patientId = extractPatientId(pdfDetail) ?? extractPatientId(currentItem.value);
    if (patientId !== null) {
      const peResponse = await axiosInstance.get(
        r(endpoints.examination.patientExaminationList),
        { params: { patient_id: patientId } }
      );
      const rows = Array.isArray(peResponse.data?.results)
        ? peResponse.data.results
        : Array.isArray(peResponse.data)
          ? peResponse.data
          : [];
      rows.forEach((row: unknown) => {
        const normalized = normalizePatientExaminationOption(row);
        if (normalized) {
          addOrReplacePatientExaminationOption(options, normalized);
        }
      });
    } else if (suggestedPatientExaminationId === null) {
      patientExaminationLoadError.value =
        'Keine bestehende Untersuchung automatisch gefunden. Es wird eine neue Untersuchung angelegt.';
    }

    patientExaminationOptions.value = options.sort((a, b) => b.id - a.id);
  } catch (error: any) {
    console.error('Error loading patient examinations for validation:', error);
    patientExaminationOptions.value = options;
    patientExaminationLoadError.value =
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      error?.message ||
      'Untersuchungen konnten nicht geladen werden.';
  } finally {
    isLoadingPatientExaminations.value = false;
  }
}

function loadCurrentItemData(item: SensitiveMeta) {
  if (!item) return;

  // reset video validation state
  shouldShowOutsideTimeline.value = false;
  videoValidationStatus.value = null;
  outsideSegmentsValidated.value = 0;
  totalOutsideSegments.value = 0;
  isValidatingVideo.value = false;
  documentTypeTouched.value = false;
  patientExaminationLoadError.value = '';
  manualPatientExaminationId.value = '';
  customTagInput.value = '';
  noMoreNamesConfirmation.value = 'unknown';

  // dates
  const rawExam = item.examinationDate || '';
  const rawDob  = item.patientDobDisplay || item.patientDob;

  examinationDate.value = normalizeDateInputToGerman(rawExam);
  const convertedGender = convertGender(item.patientGenderName)
  editedPatient.value = {
    patientFirstName: item.patientFirstName || '',
    patientLastName:  item.patientLastName  || '',
    patientGenderName: convertedGender || '',
    patientDob:       normalizeDateInputToGerman(rawDob),
    casenumber:       item.casenumber || '',
    externalId:       item.externalId ?? '',
    externalIdOrigin: item.externalIdOrigin ?? '',
    centerName:       item.centerName ?? '',
    text:             item.text ?? '',
    anonymizedText:   item.anonymizedText ?? '',
    examinersDisplay: item.examinersDisplay ?? '',
    examinationDate:  examinationDate.value,
  };

  const normalizedAnonymizedText =
    item.anonymizedText ?? editedPatient.value.anonymizedText ?? item.text ?? '';
  editedAnonymizedText.value = normalizedAnonymizedText;
  editedPatient.value.anonymizedText = normalizedAnonymizedText;
  selectedTags.value = Array.isArray(item.tags)
    ? [...item.tags].map((tag) => normalizeValidationTag(tag)).filter(Boolean).sort((a, b) => a.localeCompare(b))
    : [];
  validationComment.value =
    item.validationComment ??
    item.validation_comment ??
    '';

  const backendDocumentType =
    (item as SensitiveMeta & { documentType?: string | null }).documentType ??
    (item as SensitiveMeta & { document_type?: string | null }).document_type ??
    '';
  selectedDocumentType.value = typeof backendDocumentType === 'string' ? backendDocumentType : '';

  const backendPatientExaminationId = extractPatientExaminationId(item);
  selectedPatientExaminationOption.value =
    backendPatientExaminationId !== null ? String(backendPatientExaminationId) : '';

  original.value = {
    anonymizedText: editedAnonymizedText.value,
    examinationDate: examinationDate.value,
    tags: [...selectedTags.value],
    validationComment: validationComment.value,
    patient: { ...editedPatient.value },
  };

  validateAllDates();

  // optional: remember last file in sessionStorage
  const persistedFileId = resolveFileIdFromContext();
  if (persistedFileId !== null) {
    sessionStorage.setItem('last:fileId', String(persistedFileId));
  }
}


// Watch
watch(currentItem, async (newItem) => {
  if (!newItem) return;
  loadCurrentItemData(newItem);
  await fetchCaseResolution();
  await fetchVideoAnonymizationStatus();
  if (isPdf.value) {
    await fetchPatientExaminationOptions();
  }
}, { immediate: true });

watch(isPdf, async (pdfMode) => {
  if (!pdfMode) {
    patientExaminationOptions.value = [];
    selectedPatientExaminationOption.value = '';
    manualPatientExaminationId.value = '';
    return;
  }

  if (documentTypeOptions.value.length === 0) {
    await fetchDocumentTypeOptions();
  }
  await fetchCaseResolution();
  await fetchPatientExaminationOptions();
});




const fetchNextItem = async () => {
  try {
    await anonymizationStore.fetchNext();
  } catch (error) {
    console.error('Error fetching next item:', error);
  }
};

const dirty = computed(() =>
  editedAnonymizedText.value !== original.value.anonymizedText ||
  examinationDate.value      !== original.value.examinationDate ||
  validationComment.value    !== original.value.validationComment ||
  !areSortedStringArraysEqual(selectedTags.value, original.value.tags) ||
  !shallowEqual(editedPatient.value, original.value.patient)
);

// ✅ NEW: Can save computed property
const canSave = computed(() => {
  // Can save if we have a current item and data is not currently being processed
  return currentItem.value && !isApproving.value;
});

// Concurrency guards
const isApproving = ref(false);


const toggleImage = () => {
  showOriginal.value = !showOriginal.value;
};

// ============================================================================
// Phase 2.2: Date Validation Functions
// ============================================================================

/**
 * Validate all dates and update error panel
 */
function validateAllDates() {
  const validator = new DateValidator();
  
  // Clear previous errors
  validationErrors.value = [];
  dobErrorMessage.value = '';
  examDateErrorMessage.value = '';
  
  // Validate DOB
  if (editedPatient.value.patientDob) {
    const dobValue = editedPatient.value.patientDob;

    if (DateConverter.validate(dobValue, 'German')) {
      dobDisplayFormat.value = 'Deutsch (TT.MM.JJJJ)';
    } else {
      dobDisplayFormat.value = '';
      dobErrorMessage.value = 'Ungültiges Format. Verwenden Sie TT.MM.JJJJ';
      validator.addField('Geburtsdatum', dobValue, 'German'); // Will fail
    }
  } else {
    dobDisplayFormat.value = '';
  }
  
  // Validate Exam Date
  if (examinationDate.value) {
    const examValue = examinationDate.value;

    if (DateConverter.validate(examValue, 'German')) {
      examDateDisplayFormat.value = 'Deutsch (TT.MM.JJJJ)';
    } else {
      examDateDisplayFormat.value = '';
      examDateErrorMessage.value = 'Ungültiges Format. Verwenden Sie TT.MM.JJJJ';
      validator.addField('Untersuchungsdatum', examValue, 'German'); // Will fail
    }
  } else {
    examDateDisplayFormat.value = '';
  }
  
  // Validate DOB < ExamDate constraint
  if (dobISO.value && examISO.value) {
    validator.addConstraint(
      'DOB_BEFORE_EXAM',
      DateConverter.isBeforeOrEqual(dobISO.value, examISO.value),
      'Geburtsdatum muss vor oder am selben Tag wie das Untersuchungsdatum liegen'
    );
  }
  
  // Update validation errors
  if (validator.hasErrors()) {
    validationErrors.value = validator.getErrors();
    
    // Set specific error messages
    const errors = validator.getErrors();
    errors.forEach(error => {
      if (error.includes('Geburtsdatum')) {
        dobErrorMessage.value = error.replace('Geburtsdatum: ', '');
      }
      if (error.includes('Untersuchungsdatum')) {
        examDateErrorMessage.value = error.replace('Untersuchungsdatum: ', '');
      }
    });
  }
}

/**
 * Handle DOB blur event - validate and convert format
 */
function onDobBlur() {
  const value = editedPatient.value.patientDob;
  if (!value) return;
  
  // Normalize to German for consistent UI entry format
  const germanDate = normalizeDateInputToGerman(value);
  if (germanDate) {
    editedPatient.value.patientDob = germanDate;
    dobDisplayFormat.value = 'Deutsch (TT.MM.JJJJ)';
  }
  
  // Validate all dates
  validateAllDates();
}

/**
 * Handle Exam Date blur event - validate and convert format
 */
function onExamDateBlur() {
  const value = examinationDate.value;
  if (!value) return;
  
  // Normalize to German for consistent UI entry format
  const germanDate = normalizeDateInputToGerman(value);
  if (germanDate) {
    examinationDate.value = germanDate;
    examDateDisplayFormat.value = 'Deutsch (TT.MM.JJJJ)';
  }
  
  // Validate all dates
  validateAllDates();
}

/**
 * Clear all validation errors
 */
function clearValidationErrors() {
  validationErrors.value = [];
  dobErrorMessage.value = '';
  examDateErrorMessage.value = '';
}

// ============================================================================
// End Phase 2.2
// ============================================================================


const skipItem = async () => {
  if (currentItem.value) {
    await fetchNextItem();
  }
};

const navigateToSegmentation = () => {
  if (!currentItem.value) {
    toast.error({ text: 'Kein Video zur Segmentierung ausgewählt.' });
    return;
  }

  const videoFileId = resolveFileIdFromContext();
  if (videoFileId === null) {
    toast.error({ text: 'Video-Datei-ID konnte nicht bestimmt werden.' });
    return;
  }
  
  // Navigate with video ID as query parameter to ensure correct video selection
  router.push({ 
    name: 'Video-Untersuchung', 
    query: { video: String(videoFileId) }
  });
  
  console.log(`🎯 Navigating to Video-Untersuchung with video ID: ${videoFileId}`);
};

function toPositiveInteger(value: unknown): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return null;
  }

  const normalized = Math.trunc(parsed);
  return normalized > 0 ? normalized : null;
}

function resolveFileIdFromContext(): number | null {
  const fromSource = toPositiveInteger(sourceFileId.value);
  if (fromSource !== null) {
    return fromSource;
  }
  return toPositiveInteger(sessionStorage.getItem('last:fileId'));
}

function extractPatientExaminationId(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const obj = payload as Record<string, unknown>;
  const directMatch = toPositiveInteger(
    obj.patient_examination_id ??
      obj.patient_examination ??
      obj.patientExaminationId ??
      obj.examination_id ??
      obj.examinationId
  );
  if (directMatch !== null) {
    return directMatch;
  }

  const reportFile = obj.reportFile ?? obj.report_file;
  if (reportFile && typeof reportFile === 'object') {
    const nestedMatch = extractPatientExaminationId(reportFile);
    if (nestedMatch !== null) {
      return nestedMatch;
    }
  }

  const patientExamination = obj.patientExamination ?? obj.patient_examination;
  if (patientExamination && typeof patientExamination === 'object') {
    const nestedId = toPositiveInteger(
      (patientExamination as Record<string, unknown>).id
    );
    if (nestedId !== null) {
      return nestedId;
    }
  }

  const caseResolution = obj.caseResolution ?? obj.case_resolution;
  if (caseResolution && typeof caseResolution === 'object') {
    const nestedId = extractPatientExaminationId(caseResolution);
    if (nestedId !== null) {
      return nestedId;
    }
  }

  return null;
}

function extractPatientId(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const obj = payload as Record<string, unknown>;
  const directMatch = toPositiveInteger(
    obj.patient_id ?? obj.patientId ?? obj.pseudo_patient_id
  );
  if (directMatch !== null) {
    return directMatch;
  }

  const patientObject = obj.patient;
  if (patientObject && typeof patientObject === 'object') {
    const nestedId = toPositiveInteger((patientObject as Record<string, unknown>).id);
    if (nestedId !== null) {
      return nestedId;
    }
  }

  return null;
}

async function resolvePatientExaminationIdForPdf(
  pdfFileId: number,
  validateResponseData: unknown
): Promise<number | null> {
  const fromValidateResponse = extractPatientExaminationId(validateResponseData);
  if (fromValidateResponse !== null) {
    return fromValidateResponse;
  }

  const fromCurrentItem = extractPatientExaminationId(currentItem.value);
  if (fromCurrentItem !== null) {
    return fromCurrentItem;
  }

  try {
    const { data: pdfDetail } = await axiosInstance.get(
      r(endpoints.media.pdfDetail(pdfFileId))
    );
    const fromPdfDetail = extractPatientExaminationId(pdfDetail);
    if (fromPdfDetail !== null) {
      return fromPdfDetail;
    }

    const patientId =
      extractPatientId(pdfDetail) ?? extractPatientId(currentItem.value);
    if (patientId === null) {
      return null;
    }

    const { data: timeline } = await axiosInstance.get(
      r(endpoints.media.patientTimeline(patientId))
    );
    const results = Array.isArray(timeline?.results) ? timeline.results : [];
    const matchingItem = results.find((item: unknown) => {
      if (!item || typeof item !== 'object') {
        return false;
      }
      const entry = item as Record<string, unknown>;
      const mediaType = String(entry.media_type ?? '');
      const entryId = toPositiveInteger(entry.id);
      const rawPdfId = toPositiveInteger(entry.raw_pdf_id);

      return (
        (mediaType === 'pdf' && entryId === pdfFileId) ||
        (mediaType === 'full_report' && rawPdfId === pdfFileId)
      );
    });

    return extractPatientExaminationId(matchingItem);
  } catch (error) {
    console.warn('Could not resolve patient_examination_id for PDF deep-link.', error);
    return null;
  }
}

const navigateAfterApproval = async (
  mediaKind: 'pdf' | 'video',
  validateResponseData?: unknown
) => {
  if (mediaKind === 'video') {
    navigateToSegmentation();
    return;
  }

  const explicitPatientExaminationId = selectedPatientExaminationIdForRouting.value;
  if (explicitPatientExaminationId !== null) {
    sessionStorage.setItem(
      'last:patientExaminationId',
      String(explicitPatientExaminationId)
    );
    await router.push(`/reporting/${explicitPatientExaminationId}/report-editor`);
    toast.info({
      text: `PDF validiert. Gewählte Untersuchung ${explicitPatientExaminationId} im Berichtseditor geöffnet.`,
    });
    return;
  }

  const resolvedPatientExaminationId = await resolvePatientExaminationIdForPdf(
    resolveFileIdFromContext() ?? 0,
    validateResponseData
  );

  if (resolvedPatientExaminationId !== null) {
    sessionStorage.setItem(
      'last:patientExaminationId',
      String(resolvedPatientExaminationId)
    );
    await router.push(`/reporting/${resolvedPatientExaminationId}/report-editor`);
    toast.info({
      text: `PDF validiert. Patientenfall ${resolvedPatientExaminationId} wurde automatisch zugeordnet und im Berichtseditor geöffnet.`,
    });
    return;
  }

  await fetchCaseResolution();
  await router.push(caseResolutionRoute.value);
  toast.warning({
    text: 'Die automatische Fallzuordnung war nicht eindeutig. Bitte pruefen Sie den Ausnahmefall.',
  });
};


const approveItem = async () => {
  if (!currentItem.value || !canSave.value || isApproving.value) return;
  documentTypeTouched.value = true;
  editedPatient.value.anonymizedText = editedAnonymizedText.value;
  
  // ============================================================================
  // Phase 3.1: Segment Validation Enforcement
  // ============================================================================
  
  // Additional safety check: Prevent approval if outside segments not validated
  if (!canApprove.value) {
    const reason = approvalBlockReason.value;
    console.warn(`❌ Approval blocked: ${reason}`);
    toast.warning({ text: reason });
    return;
  }
  
  // For videos with outside segments: Ensure validation was completed
  if (isVideo.value && shouldShowOutsideTimeline.value) {
    console.warn('❌ Outside segments still pending validation');
    toast.error({ 
      text: 'Bitte validieren Sie zuerst alle Outside-Segmente, bevor Sie das Video bestätigen.' 
    });
    return;
  }
  
  // ============================================================================
  // End Phase 3.1
  // ============================================================================
  
  const mediaKind: 'pdf' | 'video' | 'unknown' =
    sourceMediaScope.value === 'pdf' || sourceMediaScope.value === 'video'
      ? sourceMediaScope.value
      : isPdf.value
        ? 'pdf'
        : isVideo.value
          ? 'video'
          : 'unknown';

  if (mediaKind === 'unknown') {
    toast.error({ text: 'Bitte Medientyp auswählen, bevor bestätigt wird.' });
    return;
  }

  const validationPayload: AnonymizationValidationPayload = {
    patient_first_name: editedPatient.value.patientFirstName,
    patient_last_name:  editedPatient.value.patientLastName,
    patient_gender:     editedPatient.value.patientGenderName,
    patient_dob:        DateConverter.toGerman(dobISO.value || '') || '',
    examination_date:   DateConverter.toGerman(examISO.value || '') || '',
    casenumber:         editedPatient.value.casenumber || '',
    anonymized_text:    editedAnonymizedText.value || undefined,
    text:               editedPatient.value.text || undefined,
    is_verified:        'true',
    file_type:          mediaKind,
    center_name:        editedPatient.value.centerName || '',
    external_id:        editedPatient.value.externalId || '',
    external_id_origin: editedPatient.value.externalIdOrigin || '',
    tags:               selectedTags.value,
    validation_comment: validationComment.value || '',
  };

  if (isPdf.value) {
    validationPayload.document_type = selectedDocumentType.value;
  }

  if (noMoreNamesConfirmation.value !== 'unknown') {
    validationPayload.no_more_names_confirmed = noMoreNamesConfirmation.value === 'confirmed';
  }

  const validationFileId = resolveFileIdFromContext();
  if (validationFileId === null) {
    toast.error({ text: 'Datei-ID konnte nicht bestimmt werden. Bitte Datei aus der Übersicht erneut öffnen.' });
    return;
  }
  isApproving.value = true;
  try {
    console.log(`Validating anonymization for file ${validationFileId}...`);
    const response = await axiosInstance.post(
      r(endpoints.anonymization.validate(validationFileId)),
      validationPayload
    );
    const reportFileId = response?.data?.reportFile?.id ?? response?.data?.report_file?.id;
    if (typeof reportFileId === 'number') {
      sessionStorage.setItem('last:reportFileId', String(reportFileId));
    }

    console.log(`Anonymization validated successfully for file ${validationFileId}`);
    toast.success({ text: 'Dokument bestätigt und Anonymisierung validiert' });

    await navigateAfterApproval(mediaKind, response?.data);

  } catch (error: any) {
    console.error('Error approving item:', error);
    const allowedTypes = normalizeDocumentTypeOptions(
      error?.response?.data?.allowedDocumentTypes ?? error?.response?.data?.allowed_document_types
    );
    if (allowedTypes.length > 0) {
      documentTypeOptions.value = allowedTypes;
    }
    const backendMessage = error?.response?.data?.error;
    toast.error({
      text: backendMessage
        ? `Fehler beim Bestätigen: ${backendMessage}`
        : 'Fehler beim Bestätigen des Elements',
    });
  } finally {
    isApproving.value = false;
  }
};


const saveAnnotation = async () => {

  
  if (!canSubmit.value) {
    // Provide more specific error messages
    if (!processedUrl.value || !originalUrl.value) {
      toast.error({ text: 'Bitte laden Sie zuerst Bilder hoch (Original und bearbeitetes Bild).' });
    } else if (!dataOk.value) {
      // Specific validation errors
      const errors = [];
      if (!firstNameOk.value) errors.push('Vorname');
      if (!lastNameOk.value) errors.push('Nachname');
      if (!isDobValid.value) errors.push('gültiges Geburtsdatum');
      if (!isExaminationDateValid.value) errors.push('gültiges Untersuchungsdatum (darf nicht vor Geburtsdatum liegen)');
      
      toast.error({ text: `Bitte korrigieren Sie: ${errors.join(', ')}` });
    }
    return;
  }
  
  try {
    const annotationData = {
      processed_image_url: processedUrl.value,
      patient_data: buildSensitiveMetaSnake(DateConverter.toGerman(dobISO.value || '') || ''),  // 🎯 Phase 2.1: DEUTSCHES FORMAT
      examinationDate: DateConverter.toGerman(examISO.value || '') || '',                       // 🎯 Phase 2.1: DEUTSCHES FORMAT
      anonymized_text: editedAnonymizedText.value,
    };

    if (currentItem.value && isVideo.value) {
      await axiosInstance.post(r('save-anonymization-annotation-video/'), {
        ...annotationData,
        itemId: currentItem.value.id,
      });
    } else if (currentItem.value && isPdf.value) {
      await axiosInstance.post(r('save-anonymization-annotation-pdf/'), annotationData);
    } else {
      toast.error({ text: 'Keine gültige Anonymisierung zum Speichern gefunden.' });
      return;
    }

    originalUrl.value = '';
    processedUrl.value = '';
    hasSuccessfulUpload.value = false;
    toast.success({ text: 'Annotation erfolgreich gespeichert' });
  } catch (error) {
    console.error('Error saving annotation:', error);
    toast.error({ text: 'Fehler beim Speichern der Annotation' });
  }
};


const rejectItem = async () => {
  if (currentItem.value) {
    await fetchNextItem();
  }
};

const navigateToCorrection = async () => {
  if (!currentItem.value) {
    toast.error({ text: 'Kein Element zur Korrektur ausgewählt.' });
    return;
  }

  // Check for unsaved changes
    try {
      const correctionFileId = resolveFileIdFromContext();
      if (correctionFileId === null) {
        toast.error({ text: 'Datei-ID für Korrektur konnte nicht bestimmt werden.' });
        return;
      }
      await router.push({
        name: 'Anonymisierung Korrektur',
        params: { fileId: String(correctionFileId) },
        query: { mediaType: sourceMediaScope.value || (isVideo.value ? 'video' : 'pdf') }
      });
      // approveItem will navigate to next item, so we need to return
      toast.info({ text: 'Änderungen gespeichert. Bitte wählen Sie das Element erneut für die Korrektur aus.' });
      return;
    } catch (error) {
      toast.error({ text: 'Fehler beim Speichern. Korrektur-Navigation abgebrochen.' });
      return;
    }
};


onMounted(async () => {
  if (isPdf.value) {
    await fetchDocumentTypeOptions();
  }

  if (Number.isFinite(fileId) && scope) {
    mediaStore.setCurrentByKey(scope, fileId);
  }

  const initializedFromRoute = await initializeCurrentItemFromRouteContext();

  if (!initializedFromRoute && !anonymizationStore.current) {
    await fetchNextItem();
  } else if (anonymizationStore.current) {
    loadCurrentItemData(anonymizationStore.current);
    await fetchCaseResolution();
    await fetchVideoAnonymizationStatus();
  }
});


</script>

<style scoped>
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 10px;
  font-size: 0.9rem;
  max-height: 300px;
  overflow-y: auto;
}

.form-control:focus, .form-select:focus {
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.pdf-viewer-container {
  height: 850px;
  overflow: hidden;
}

.pdf-viewer-container iframe {
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
}

.media-viewer-container {
  height: 850px;
  overflow: hidden;
}

.media-viewer-container iframe,
.media-viewer-container video {
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
}

/* Dual Video/PDF Container Styles */
.dual-video-container .video-section,
.dual-pdf-container .pdf-section {
  border: 1px solid #e9ecef;
  border-radius: 0.375rem;
  padding: 1rem;
  background-color: #f8f9fa;
}

.dual-video-container .video-section.raw-video,
.dual-pdf-container .pdf-section.raw-pdf {
  border-color: #dc3545;
  background-color: #fff5f5;
}

.dual-video-container .video-section.anonymized-video,
.dual-pdf-container .pdf-section.anonymized-pdf {
  border-color: #198754;
  background-color: #f0fff4;
}

/* PDF-specific styling */
.dual-pdf-container .pdf-section iframe {
  border: 2px solid #dee2e6;
  border-radius: 0.25rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.dual-pdf-container .pdf-section.raw-pdf iframe {
  border-color: #dc3545;
}

.dual-pdf-container .pdf-section.anonymized-pdf iframe {
  border-color: #198754;
}

/* ✅ NEW: Outside Timeline Container Styles */
.outside-timeline-container {
  max-height: 400px;
  overflow-y: auto;
}

.outside-timeline-container .card {
  margin-bottom: 0;
}

.outside-timeline-container .card-header {
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 2px solid #ffc107;
}

/* Video validation status styles */
.alert.alert-warning {
  border-left: 4px solid #ffc107;
}

.alert.alert-success {
  border-left: 4px solid #198754;
}

.alert.alert-danger {
  border-left: 4px solid #dc3545;
}

.alert.alert-info {
  border-left: 4px solid #0dcaf0;
}

/* Video controls enhancement */
.video-controls .btn {
  min-width: 150px;
}

.video-controls .btn .spinner-border-sm {
  width: 0.875rem;
  height: 0.875rem;
}

.linkage-meta-box {
  height: 100%;
  padding: 0.75rem 0.875rem;
  border: 1px solid #e9ecef;
  border-radius: 0.5rem;
  background: #f8f9fa;
}

.linkage-meta-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6c757d;
  margin-bottom: 0.35rem;
}

.linkage-meta-value {
  font-size: 0.95rem;
  color: #212529;
  word-break: break-word;
}

</style>
