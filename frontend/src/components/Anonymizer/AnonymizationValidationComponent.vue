<template>
  <div class="container-fluid py-4">
    <div class="card">
      <div class="card-header pb-0">
        <h4 class="mb-0">Anonymisierungsvalidierung und Annotationen</h4>
      </div>
      <div class="card-body">
        <!-- Loading and Error States -->
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Wird geladen...</span>
          </div>
          <p class="mt-2">Anonymisierte Daten werden geladen...</p>
        </div>

        <div v-else-if="error" class="alert alert-danger" role="alert">
          <strong>Fehler:</strong> {{ error }}
        </div>

        <div v-else-if="!currentItem" class="alert alert-info" role="alert">
          Keine weiteren Datensätze zur Validierung vorhanden.
        </div>

        <!-- Main Content When Data is Available -->
        <template v-else>
          <!-- Patient Information Section -->
          <div class="row mb-4">
            <div class="col-md-6">
              <div class="card bg-light">
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
                </div>
              </div>
            </div>

            <div class="col-md-6">
              <!-- Annotation Section -->
              <div class="card bg-light">
                <div class="card-body">
                  <h5 class="card-title">Annotationen</h5>
                  <div class="mb-3">
                    <label class="form-label">Bild hochladen:</label>
                    <input 
                      type="file" 
                      class="form-control" 
                      @change="handleFileUpload"
                      accept="image/*"
                    >
                  </div>
                  <div v-if="uploadedFile" class="mt-3">
                    <img :src="displayedImageUrl" class="img-fluid" alt="Uploaded Image">
                    <button 
                      class="btn btn-info btn-sm mt-2"
                      @click="toggleImage"
                    >
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
          </div>

          <!-- Action Buttons -->
          <div class="row">
            <div class="col-12 d-flex justify-content-between">
              <button class="btn btn-secondary" @click="skipItem">
                Überspringen
              </button>
              <div>
                <button 
                  class="btn btn-danger me-2" 
                  @click="rejectItem"
                >
                  Ablehnen
                </button>
                <button 
                  class="btn btn-success" 
                  @click="approveItem"
                  :disabled="!isExaminationDateValid">
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

<script>
import axiosInstance from '@/api/axiosInstance';
import { ref, computed, reactive, watch } from 'vue';

export default {
  name: 'AnonymizationValidationComponent',
  setup() {
    const loading = ref(true);
    const error = ref(null);
    const currentItem = ref(null);
    const editMode = ref(false);
    const editedAnonymizedText = ref('');
    const examinationDate = ref('');
    const uploadedFile = ref(null);
    const processedImageUrl = ref(null);
    const originalImageUrl = ref(null);
    const showOriginal = ref(false);

    const editedPatient = reactive({
      patient_first_name: '',
      patient_last_name: '',
      patient_gender: '',
      patient_dob: '',
      casenumber: ''
    });

    const isExaminationDateValid = computed(() => {
      if (!examinationDate.value || !editedPatient.patient_dob) return true;
      return new Date(examinationDate.value) >= new Date(editedPatient.patient_dob);
    });

    const displayedImageUrl = computed(() => {
      return showOriginal.value ? originalImageUrl.value : processedImageUrl.value;
    });

    const canSubmit = computed(() => {
      return processedImageUrl.value && uploadedFile.value;
    });

    const loadData = async () => {
      loading.value = true;
      error.value = null;
      
      try {
        const response = await axiosInstance.get('/api/pdf/anony_text/');
        const data = response.data;
        if (data) {
          currentItem.value = data;
          editedAnonymizedText.value = currentItem.value.anonymized_text;
          
          const meta = currentItem.value.report_meta;
          editedPatient.patient_first_name = meta.patient_first_name || '';
          editedPatient.patient_last_name = meta.patient_last_name || '';
          editedPatient.patient_gender = meta.patient_gender || '';
          editedPatient.patient_dob = meta.patient_dob || '';
          editedPatient.casenumber = meta.casenumber || '';
          examinationDate.value = meta.examination_date || '';
        } else {
          currentItem.value = null;
        }
      } catch (err) {
        error.value = `Fehler beim Laden der Daten: ${err.message}`;
      } finally {
        loading.value = false;
      }
    };

    const handleFileUpload = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await axiosInstance.post('/api/upload-image/', formData);
        processedImageUrl.value = response.data.processed_image_url;
        originalImageUrl.value = response.data.original_image_url;
        uploadedFile.value = file;
      } catch (error) {
        error.value = `Fehler beim Hochladen: ${error.message}`;
      }
    };

    const saveAnnotation = async () => {
      if (!canSubmit.value) return;

      const annotationData = {
        image_name: uploadedFile.value.name,
        processed_image_url: processedImageUrl.value,
        original_image_url: originalImageUrl.value,
      };

      try {
        await axiosInstance.post('/api/save-annotation/', annotationData);
        alert('Annotation gespeichert!');
      } catch (error) {
        error.value = `Fehler beim Speichern: ${error.message}`;
      }
    };

    const toggleImage = () => {
      showOriginal.value = !showOriginal.value;
    };

    const approveItem = async () => {
      if (!isExaminationDateValid.value) return;
      
      loading.value = true;
      try {
        const updateData = {
          id: currentItem.value.id,
          anonymized_text: editedAnonymizedText.value,
          report_meta: {
            ...currentItem.value.report_meta,
            patient_first_name: editedPatient.patient_first_name,
            patient_last_name: editedPatient.patient_last_name,
            patient_gender: editedPatient.patient_gender,
            patient_dob: editedPatient.patient_dob,
            casenumber: editedPatient.casenumber,
            examination_date: examinationDate.value
          }
        };
        
        await axiosInstance.patch('/api/pdf/update_anony_text/', updateData);
        await loadData();
      } catch (err) {
        error.value = `Fehler beim Speichern: ${err.message}`;
      } finally {
        loading.value = false;
      }
    };

    const rejectItem = async () => {
      loading.value = true;
      try {
        await axiosInstance.patch('/api/pdf/update_anony_text/', {
          id: currentItem.value.id,
          status: 'rejected'
        });
        await loadData();
      } catch (err) {
        error.value = `Fehler beim Ablehnen: ${err.message}`;
      } finally {
        loading.value = false;
      }
    };

    const skipItem = async () => {
      loadData();
    };

    watch(currentItem, (newItem) => {
      if (newItem) {
        editedAnonymizedText.value = newItem.anonymized_text;
      }
    });

    loadData();

    return {
      loading,
      error,
      currentItem,
      editMode,
      editedAnonymizedText,
      editedPatient,
      examinationDate,
      isExaminationDateValid,
      approveItem,
      rejectItem,
      skipItem,
      handleFileUpload,
      saveAnnotation,
      toggleImage,
      displayedImageUrl,
      canSubmit,
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

.card {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.form-control:focus, .form-select:focus {
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}
</style>
