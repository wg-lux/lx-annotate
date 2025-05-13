<template>
  <div class="container-fluid py-4">
    <div class="card">
      <div class="card-header pb-0">
        <h4 class="mb-0">Anonymisierungsvalidierung und Annotationen</h4>
      </div>
      <div class="card-body">
        <!-- Loading / Error States -->
        <div v-if="store.loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Wird geladen...</span>
          </div>
          <p class="mt-2">Anonymisierte Daten werden geladen...</p>
        </div>

        <div v-else-if="store.error" class="alert alert-danger" role="alert">
          <strong>Fehler:</strong> {{ store.error }}
        </div>

        <div v-else-if="!currentItem" class="alert alert-info" role="alert">
          Alle Anonymisierungen wurden bearbeitet.
        </div>

        <!-- Main Content When Data is Available -->
        <template v-else>
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
                      v-model="editedPatient.patient_first_name"
                    >
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Nachname:</label>
                    <input 
                      type="text" 
                      class="form-control" 
                      v-model="editedPatient.patient_last_name"
                    >
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Geschlecht:</label>
                    <select class="form-select" v-model="editedPatient.patient_gender">
                      <option value="male">Männlich</option>
                      <option value="female">Weiblich</option>
                      <option value="other">Divers</option>
                    </select>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Geburtsdatum:</label>
                    <input 
                      type="date" 
                      class="form-control" 
                      v-model="editedPatient.patient_dob"
                    >
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
                      type="date" 
                      class="form-control" 
                      v-model="examinationDate"
                      :class="{ 'is-invalid': !isExaminationDateValid }"
                    >
                    <div class="invalid-feedback" v-if="!isExaminationDateValid">
                      Das Untersuchungsdatum darf nicht vor dem Geburtsdatum liegen.
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Anonymisierter Text:</label>
                    <textarea  class="form-control"
                            rows="6"
                            v-model="editedAnonymizedText" />
                  </div>
                </div>
              </div>

              <!-- Annotation Section -->
              <div class="card bg-light">
                <div class="card-body">
                  <h5 class="card-title">Annotationen</h5>
                  <div class="mb-3">
                    <!-- FilePond Component -->
                    <FilePond ref="pond" name="file"
                      accepted-file-types="image/*"
                      label-idle="Bild hier ablegen oder klicken" />
                  </div>
                  <div v-if="processedUrl" class="mt-3">
                    <img :src="showOriginal ? originalUrl : processedUrl"
                         class="img-fluid" alt="Uploaded Image">
                    <button class="btn btn-info btn-sm mt-2" @click="toggleImage">
                      {{ showOriginal ? 'Bearbeitetes Bild anzeigen' : 'Original anzeigen' }}
                    </button>
                  </div>
                  <div class="mt-3">
                    <button 
                      class="btn btn-primary"
                      @click="saveAnnotation"
                      :disabled="!canSubmit"
                    >
                      Annotation speichern
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- PDF Viewer Section (New Column) -->
            <div class="col-md-7">
              <div class="card">
                <div class="card-header pb-0">
                  <h5 class="mb-0">PDF Vorschau</h5>
                </div>
                <div class="card-body pdf-viewer-container">
                  <iframe
                    v-if="currentItem && currentItem.report_meta && currentItem.report_meta.pdf_url"
                    :src="currentItem.report_meta.pdf_url"
                    width="100%"
                    height="800px"
                    frameborder="0"
                    title="PDF Vorschau"
                  >
                    Ihr Browser unterstützt keine eingebetteten PDFs. Sie können die Datei <a :href="currentItem.report_meta.pdf_url">hier herunterladen</a>.
                  </iframe>
                  <div v-else class="alert alert-secondary">
                    Keine PDF-URL verfügbar.
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
              <div>
                <button class="btn btn-danger me-2" @click="rejectItem">
                  Ablehnen
                </button>
                <button 
                  class="btn btn-success" 
                  @click="approveItem"
                  :disabled="!isExaminationDateValid || !dirty">
                  Bestätigen
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue';
import { useAnonymizationStore, type PatientData } from '@/stores/anonymizationStore';
import vueFilePond from 'vue-filepond';
import axiosInstance, { r } from '@/api/axiosInstance';
import { setOptions, registerPlugin } from 'filepond';

import FilePondPluginImagePreview        from 'filepond-plugin-image-preview';
import FilePondPluginFileValidateType    from 'filepond-plugin-file-validate-type';

registerPlugin(
  FilePondPluginImagePreview,
  FilePondPluginFileValidateType
);

const FilePond = vueFilePond(
  FilePondPluginImagePreview,
  FilePondPluginFileValidateType
);

export default {
  name: 'AnonymizationValidationComponent',
  components: { FilePond },
  setup() {
    const store = useAnonymizationStore();

    // Lokaler State
    const editedAnonymizedText = ref('');
    const examinationDate = ref('');
    const editedPatient = reactive({
      patient_first_name: '',
      patient_last_name: '',
      patient_gender: '',
      patient_dob: '',
      casenumber: ''
    });

    // Computed Property für das aktuelle Element
    const currentItem = computed(() => store.current);

    // Einmalige Definition der Upload-bezogenen Refs
    const originalUrl = ref('');
    const processedUrl = ref('');
    const showOriginal = ref(false);
    const pond = ref<any>(null);

    // FilePond global konfigurieren – nachdem die Refs existieren
    setOptions({
      allowRevert: true,
      chunkUploads: true,
      maxParallelUploads: 3,
      server: {
        process(field, file, metadata, load, error, progress) {
          const fd = new FormData();
          fd.append(field, file);
          axiosInstance.post(r('upload-image/'), fd, {
            onUploadProgress: e => progress(true, e.loaded ?? 0, e.total ?? 0)
          })
          .then(({ data }) => {
            originalUrl.value  = data.original_image_url;
            processedUrl.value = data.processed_image_url;
            load(data.upload_id);
          })
          .catch(err => error(err.message));
        },
        revert(id, load) {
          axiosInstance.delete(r(`upload-image/${id}/`)).finally(load);
        }
      }
    });

    // Fehlende Funktionen und Props
    const toggleImage = () => { showOriginal.value = !showOriginal.value };

    // Beispiel: Annotation speichern (hier einfach als Platzhalter)
    const saveAnnotation = async () => {
      console.log('Annotation gespeichert');
    };

    // Berechnung, ob das Formular absendbar ist
    const canSubmit = computed(() => {
      return editedAnonymizedText.value.trim() !== '' && isExaminationDateValid.value;
    });

    // Dirty state: prüfen, ob ein Feld geändert wurde
    const dirty = computed(() => {
        if (!currentItem.value) return false;
        const meta = currentItem.value.report_meta;
        return editedAnonymizedText.value !== (currentItem.value.anonymized_text ?? '') ||
               editedPatient.patient_first_name !== (meta?.patient_first_name ?? '') ||
               editedPatient.patient_last_name !== (meta?.patient_last_name ?? '') ||
               editedPatient.patient_gender !== (meta?.patient_gender ?? '') ||
               editedPatient.patient_dob !== (meta?.patient_dob?.split(/[ T]/)[0] ?? '') ||
               editedPatient.casenumber !== (meta?.casenumber ?? '') ||
               examinationDate.value !== (meta?.examination_date?.split(/[ T]/)[0] ?? '');
    });

    // Funktion zum Befüllen der Formularfelder
    const populateForm = (item: PatientData | null) => {
      console.log('Populating form with item:', item);
      if (!item?.report_meta) {
         console.log('No item or report_meta found, clearing form.');
         editedAnonymizedText.value = '';
         editedPatient.patient_first_name = '';
         editedPatient.patient_last_name = '';
         editedPatient.patient_gender = '';
         editedPatient.patient_dob = '';
         editedPatient.casenumber = '';
         examinationDate.value = '';
         return;
      }

      const m = item.report_meta;
      editedAnonymizedText.value = item.anonymized_text ?? '';
      editedPatient.patient_first_name = m.patient_first_name ?? '';
      editedPatient.patient_last_name  = m.patient_last_name  ?? '';
      editedPatient.patient_gender     = m.patient_gender     ?? '';
      editedPatient.patient_dob        = m.patient_dob?.split(/[ T]/)[0] ?? '';
      editedPatient.casenumber         = m.casenumber         ?? '';
      examinationDate.value            = m.examination_date?.split(/[ T]/)[0] ?? '';
      console.log('Form populated:', {
          text: editedAnonymizedText.value,
          patient: { ...editedPatient },
          examDate: examinationDate.value
      });
    };

    // Watcher für currentItem
    watch(currentItem, (newItem, oldItem) => {
      if (newItem?.id !== oldItem?.id || (!newItem && oldItem)) {
          console.log('currentItem changed detected, calling populateForm.');
          populateForm(newItem);
      } else {
          console.log('currentItem watcher triggered, but no relevant change detected.');
      }
    }, { immediate: true });

    // Laden der Daten über den Store
    const loadData = async () => {
      console.log('loadData called. Current item ID before fetch:', currentItem.value?.id);
      await store.fetchNext();
      console.log('loadData finished fetchNext. Current item ID after fetch:', store.current?.id);
    };

    // Approve flow: nutzt patchPdf vom Store
    const approveItem = async () => {
      if (!isExaminationDateValid.value || !currentItem.value || !currentItem.value.report_meta) return;
      try {
        const reportMetaDataToSend: any = {
             id: currentItem.value.report_meta.id,
             patient_first_name: editedPatient.patient_first_name,
             patient_last_name: editedPatient.patient_last_name,
             patient_gender: editedPatient.patient_gender,
             patient_dob: editedPatient.patient_dob,
             casenumber: editedPatient.casenumber,
             examination_date: examinationDate.value
        };

        await store.patchPdf({
          id: currentItem.value.id,
          anonymized_text: editedAnonymizedText.value,
          status: 'approved',
          report_meta: reportMetaDataToSend
        });
        await loadData();
      } catch (err: any) {
        store.error = err.message ?? 'Fehler beim Bestätigen';
      }
    };

    const rejectItem = async () => {
       if (!currentItem.value) return;
      try {
        await store.patchPdf({
          id: currentItem.value.id,
          status: 'rejected'
        });
        await loadData();
      } catch (err: any) {
         store.error = err.message ?? 'Fehler beim Ablehnen';
      }
    };

    const skipItem = async () => {
      await loadData();
    };

    const isExaminationDateValid = computed(() => {
      if (!examinationDate.value || !editedPatient.patient_dob) return true;
      return new Date(examinationDate.value) >= new Date(editedPatient.patient_dob);
    });

    // Prepopulate form fields on component mount
    onMounted(() => {
      console.log('Component mounted, calling initial loadData.');
      loadData();
    });

    return {
      store,
      currentItem,
      editedAnonymizedText,
      editedPatient,
      examinationDate,
      isExaminationDateValid,
      dirty,
      approveItem,
      rejectItem,
      skipItem,
      showOriginal,
      originalUrl,
      processedUrl,
      toggleImage,
      saveAnnotation,
      canSubmit,
      pond,
    };
  }
};
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

/* Optional: Style for the PDF container if needed */
.pdf-viewer-container {
  height: 850px;
  overflow: hidden;
}

.pdf-viewer-container iframe {
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
}
</style>
