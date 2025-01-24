<template>
    <div class="container-fluid py-4">
      <div class="row">
        <div class="col-12 mb-4">
          <div class="card">
            <div class="card-header pb-0">
              <h4 class="mb-0">Fallgenerator</h4>
            </div>
            <div class="card-body">
              <!-- Dokument Upload -->
              <div class="row mb-4">
                <div class="col-md-6">
                  <div class="form-group">
                    <label class="form-control-label">Dokument hochladen</label>
                    <div class="upload-area" @dragover.prevent @drop.prevent="handleDrop" @click="triggerFileInput">
                      <span v-if="!uploadedFile">Datei hierhin ziehen oder klicken, um hochzuladen</span>
                      <span v-else>{{ uploadedFile.name }}</span>
                    </div>
                    <input type="file" class="d-none" ref="fileInput" @change="handleFileUpload">
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-check form-switch mt-4">
                    <input class="form-check-input" type="checkbox" v-model="fileUserValidation">
                    <label class="form-check-label">Benutzer-Validierung für Datei</label>
                  </div>
                </div>
              </div>
  
              <!-- Dokumententyp Auswahl -->
              <div class="row mb-4">
                <div class="col-md-6">
                  <div class="form-group">
                    <label class="form-control-label">Dokumententyp</label>
                    <select class="form-control" v-model="documentType">
                      <option value="video">Video</option>
                      <option value="examination">Untersuchungsbericht (PDF)</option>
                      <option value="histology">Histologie-Bericht</option>
                    </select>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group">
                    <label class="form-control-label">Texttyp</label>
                    <select class="form-control" v-model="textType">
                      <option value="original">Original</option>
                      <option value="extracted">Extrahierter Text</option>
                      <option value="processed">Verarbeiteter (anonymisierter) Text</option>
                    </select>
                  </div>
                </div>
              </div>
  
              <!-- Details zur Untersuchungsakte -->
              <div v-if="documentType === 'examination'" class="row mb-4">
                <div class="col-md-12">
                  <div class="card bg-gray-100">
                    <div class="card-body">
                      <h6 class="mb-3">Details zur Untersuchungsakte</h6>
                      <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox" v-model="isFinal">
                        <label class="form-check-label">Abgeschlossen</label>
                      </div>
                      <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox" v-model="containsHisto">
                        <label class="form-check-label">Enthält Histologie</label>
                      </div>
                      <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox" v-model="followupOneYear">
                        <label class="form-check-label">Nachkontrolle nach 1 Jahr</label>
                      </div>
                      <div class="form-check">
                        <input class="form-check-input" type="checkbox" v-model="isPreliminary">
                        <label class="form-check-label">Vorläufig</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
  
              <!-- Patientendaten -->
              <div class="row mb-4">
                <div class="col-md-12">
                  <h6 class="mb-3">Patientendaten</h6>
                </div>
                <div class="col-md-4">
                  <div class="form-group">
                    <label class="form-control-label">Vorname</label>
                    <input type="text" class="form-control" v-model="patientFirstName" placeholder="Vorname">
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="form-group">
                    <label class="form-control-label">Nachname</label>
                    <input type="text" class="form-control" v-model="patientLastName" placeholder="Nachname">
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="form-group">
                    <label class="form-control-label">Geburtsdatum</label>
                    <input type="date" class="form-control" v-model="patientBirthDate">
                  </div>
                </div>
              </div>
  
              <!-- Untersuchungsdetails -->
              <div class="row mb-4">
                <div class="col-md-6">
                  <div class="form-group">
                    <label class="form-control-label">Untersuchungsdatum</label>
                    <input type="date" class="form-control" v-model="examinationDate">
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group">
                    <label class="form-control-label">Untersuchungstyp</label>
                    <input type="text" class="form-control" value="Koloskopie" disabled>
                  </div>
                </div>
              </div>
  
              <!-- Editor für verarbeiteten Text -->
              <div v-if="textType === 'processed'" class="row mb-4">
                <div class="col-12">
                  <div class="form-group">
                    <label class="form-control-label">Editor für verarbeiteten Text</label>
                    <textarea class="form-control" rows="4" v-model="processedText"></textarea>
                  </div>
                </div>
              </div>
  
              <!-- Absenden -->
              <div class="row">
                <div class="col-12">
                  <button class="btn btn-primary" @click="handleSubmit">Fall generieren</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'CaseGenerator',
    data() {
      return {
        fileUserValidation: false,
        documentType: 'examination',
        textType: 'original',
        isFinal: false,
        containsHisto: false,
        followupOneYear: false,
        isPreliminary: false,
        patientFirstName: '',
        patientLastName: '',
        patientBirthDate: '',
        examinationDate: '',
        processedText: '',
        uploadedFile: null
      };
    },
    methods: {
      triggerFileInput() {
        this.$refs.fileInput.click();
      },
      handleDrop(event) {
        this.uploadedFile = event.dataTransfer.files[0];
      },
      handleFileUpload(event) {
        this.uploadedFile = event.target.files[0];
      },
      validateForm() {
        if (this.documentType === 'examination') {
          if (this.isPreliminary && !this.containsHisto) {
            return 'Vorläufige Berichte sollten angeben, ob Histologie erforderlich ist.';
          }
  
          const examDate = new Date(this.examinationDate);
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
          if (examDate < oneYearAgo && !this.followupOneYear) {
            return 'Untersuchungen, die älter als 1 Jahr sind, erfordern eine Nachkontrolle.';
          }
        }
        return null;
      },
      handleSubmit() {
        const validationError = this.validateForm();
        if (validationError) {
          alert(validationError);
          return;
        }
  
        const caseData = {
          fileUserValidation: this.fileUserValidation,
          documentType: this.documentType,
          textType: this.textType,
          examinationDetails: {
            isFinal: this.isFinal,
            containsHisto: this.containsHisto,
            followupOneYear: this.followupOneYear,
            isPreliminary: this.isPreliminary
          },
  
          patientInfo: {
            firstName: this.patientFirstName,
            lastName: this.patientLastName,
            birthDate: this.patientBirthDate
          },
          examinationType: 'Kolo',
          examinationDate: this.examinationDate,
          processedText: this.processedText,
          file: this.uploadedFile
        };
  
        // Emit the data to parent component
        this.$emit('case-generated', caseData);
      }
    }
  }
  </script>
  
  <style scoped>
  
  .form-control:focus {
    border-color: #596CFF;
    box-shadow: 0 0 0 0.2rem rgba(233, 30, 99, 0.25);
  }
  
  .form-check-input:checked {
    background-color: #596CFF;
    border-color: #596CFF;
  }
  </style>