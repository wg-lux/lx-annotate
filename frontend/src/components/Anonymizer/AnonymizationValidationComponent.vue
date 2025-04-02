<template>
  <div class="container-fluid py-4">
    <div class="card">
      <div class="card-header pb-0">
        <h4 class="mb-0">Anonymisierungsvalidierung</h4>
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
              <!-- Original Text -->
              <div class="card mb-4">
                <div class="card-header">
                  <h5 class="mb-0">Originaler Text</h5>
                </div>
                <div class="card-body">
                  <pre class="text-wrap">{{ currentItem.text }}</pre>
                </div>
              </div>

              <!-- Anonymized Text -->
              <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                  <h5 class="mb-0">Anonymisierter Text</h5>
                  <button class="btn btn-sm btn-outline-primary" @click="editMode = !editMode">
                    {{ editMode ? 'Vorschau' : 'Bearbeiten' }}
                  </button>
                </div>
                <div class="card-body">
                  <textarea 
                    v-if="editMode" 
                    class="form-control" 
                    rows="10" 
                    v-model="editedAnonymizedText"
                  ></textarea>
                  <pre v-else class="text-wrap">{{ editedAnonymizedText }}</pre>
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
    
    const editedPatient = reactive({
      patient_first_name: '',
      patient_last_name: '',
      patient_gender: '',
      patient_dob: '',
      casenumber: ''
    });

    // Validate examination date
    const isExaminationDateValid = computed(() => {
      if (!examinationDate.value || !editedPatient.patient_dob) return true;
      return new Date(examinationDate.value) >= new Date(editedPatient.patient_dob);
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
          
          // Set patient info
          const meta = currentItem.value.report_meta;
          editedPatient.patient_first_name = meta.patient_first_name || '';
          editedPatient.patient_last_name = meta.patient_last_name || '';
          editedPatient.patient_gender = meta.patient_gender || '';
          editedPatient.patient_dob = meta.patient_dob || '';
          editedPatient.casenumber = meta.casenumber || '';
          
          // Extract examination date if available
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

    // Watch for changes in current item
    watch(currentItem, (newItem) => {
      if (newItem) {
        editedAnonymizedText.value = newItem.anonymized_text;
      }
    });

    // Initial data load
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
      skipItem
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
