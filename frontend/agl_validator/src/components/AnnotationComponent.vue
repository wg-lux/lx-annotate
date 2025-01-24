<template>
  <div class="container-fluid py-4">
    <div class="card">
      <div class="card-header pb-0">
        <h4 class="mb-0">Annotationen für Frames der Endoskopie</h4>
      </div>
      <div class="card-body">
        <!-- File Upload Section -->
        <div class="row mb-4">
          <div class="col-12">
            <div class="form-group">
              <label class="form-control-label">Bild hochladen</label>
              <input 
                type="file" 
                class="form-control" 
                @change="handleFileUpload"
                accept="image/*"
              >
            </div>
          </div>
        </div>

        <!-- Image Card with Name Dropping -->
        <div class="row mb-4">
          <div class="col-12">
            <div 
              class="card mb-4 position-relative" 
              @drop="handleDrop" 
              @dragover.prevent
              ref="imageCard"
            >
              <!-- Background Image -->
              <img 
                v-if="displayedImageUrl" 
                :src="displayedImageUrl" 
                class="img-fluid" 
                alt="Displayed Image"
              >
              
              <!-- Original Image Toggle -->
              <div v-if="originalImageUrl" class="position-absolute top-0 end-0 m-2">
                <button 
                  class="btn btn-info btn-sm"
                  @click="toggleImage"
                >
                  {{ showOriginal ? 'Show Processed' : 'Show Original' }}
                </button>
              </div>

              <!-- Dropped Names -->
              <div 
                v-for="(nameData, index) in droppedNames" 
                :key="index"
                :style="{ 
                  top: nameData.y + 'px', 
                  left: nameData.x + 'px', 
                  position: 'absolute',
                  cursor: 'move'
                }"
                class="dropped-name"
                draggable="true"
                @dragstart="handleDragStart(nameData, $event)"
              >
                {{ nameData.displayText }}
              </div>
            </div>
          </div>
        </div>

        <!-- Name Generator Section -->
        <div class="row mb-4">
          <div class="col-12">
            <div class="card bg-light">
              <div class="card-body">
                <h5 class="card-title">Namensgenerator</h5>
                
                <!-- Gender Selection -->
                <div class="mb-3">
                  <label class="form-label">Geschlecht:</label>
                  <div class="form-check form-check-inline">
                    <input class="form-check-input" type="radio" id="male" 
                           value="male" v-model="selectedGender">
                    <label class="form-check-label" for="male">Männlich</label>
                  </div>
                  <div class="form-check form-check-inline">
                    <input class="form-check-input" type="radio" id="female" 
                           value="female" v-model="selectedGender">
                    <label class="form-check-label" for="female">Weiblich</label>
                  </div>
                </div>

                <!-- Name Generation Buttons -->
                <div class="mb-3">
                  <button 
                    @click="handleAddRandomFirstName" 
                    class="btn btn-info me-2"
                    :disabled="!selectedGender"
                  >
                    Vorname generieren
                  </button>
                  <button 
                    @click="handleAddRandomLastName" 
                    class="btn btn-info me-2"
                    :disabled="!selectedGender"
                  >
                    Nachname generieren
                  </button>
                  <button 
                    @click="handleAddRandomFullName" 
                    class="btn btn-info"
                    :disabled="!selectedGender"
                  >
                    Vollständigen Namen generieren
                  </button>
                </div>

                <!-- Generated Names Lists -->
                <div class="name-lists mt-4">
                  <!-- First Names -->
                  <div class="name-list mb-3">
                    <h6>Vornamen</h6>
                    <div
                      v-for="(name, index) in randomFirstNames"
                      :key="'first-' + index"
                      class="name-item card p-3 d-flex flex-row align-items-center mb-2"
                      draggable="true"
                      @dragstart="handleDragStart({ type: 'firstName', name }, $event)"
                    >
                      <div>{{ name }}</div>
                      <button 
                        class="btn btn-danger btn-sm ms-auto" 
                        @click="removeName('firstName', index)"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>

                  <!-- Last Names -->
                  <div class="name-list mb-3">
                    <h6>Nachnamen</h6>
                    <div
                      v-for="(name, index) in randomLastNames"
                      :key="'last-' + index"
                      class="name-item card p-3 d-flex flex-row align-items-center mb-2"
                      draggable="true"
                      @dragstart="handleDragStart({ type: 'lastName', name }, $event)"
                    >
                      <div>{{ name }}</div>
                      <button 
                        class="btn btn-danger btn-sm ms-auto" 
                        @click="removeName('lastName', index)"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>

                  <!-- Full Names -->
                  <div class="name-list">
                    <h6>Vollständige Namen</h6>
                    <div
                      v-for="(name, index) in randomFullNames"
                      :key="'full-' + index"
                      class="name-item card p-3 d-flex flex-row align-items-center mb-2"
                      draggable="true"
                      @dragstart="handleDragStart({ type: 'fullName', name }, $event)"
                    >
                      <div>{{ name }}</div>
                      <button 
                        class="btn btn-danger btn-sm ms-auto" 
                        @click="removeName('fullName', index)"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="row">
          <div class="col-12">
            <button 
              @click="saveAnnotation" 
              class="btn btn-primary"
              :disabled="!canSubmit"
            >
              Annotation speichern
            </button>
          </div>
        </div>

        <!-- Error Messages -->
        <div v-if="errorMessage" class="alert alert-danger mt-3" role="alert">
          {{ errorMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const API_URL = 'http://127.0.0.1:8000/api';

export default {
  name: 'UnifiedAnnotationComponent',
  data() {
    return {
      selectedGender: '',
      randomFirstNames: [],
      randomLastNames: [],
      randomFullNames: [],
      droppedNames: [],
      errorMessage: '',
      uploadedFile: null,
      processedImageUrl: null,
      originalImageUrl: null,
      showOriginal: false,
      femaleFirstNames: [],
      femaleLastNames: [],
      maleFirstNames: [],
      maleLastNames: []
    };
  },
  computed: {
    canSubmit() {
      return this.processedImageUrl && this.droppedNames.length > 0;
    },
    displayedImageUrl() {
      return this.showOriginal ? this.originalImageUrl : this.processedImageUrl;
    }
  },
  methods: {
    async loadNames() {
      const loadNameFile = async (filePath) => {
        try {
          const response = await fetch(filePath);
          const text = await response.text();
          return text.replace(/\r\n/g, '\n')
            .split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0);
        } catch (error) {
          console.error(`Error loading names from ${filePath}:`, error);
          throw error;
        }
      };

      try {
        // Load all name files
        this.femaleFirstNames = await loadNameFile('./assets/names-dictionary/first_names_female_ascii.txt');
        this.femaleLastNames = await loadNameFile('./assets/names-dictionary/last_names_female_ascii.txt');
        this.maleFirstNames = await loadNameFile('./assets/names-dictionary/first_names_male_ascii.txt');
        this.maleLastNames = await loadNameFile('./assets/names-dictionary/last_names_male_ascii.txt');

        // Validate loaded names
        if (!this.femaleFirstNames.length || !this.femaleLastNames.length || 
            !this.maleFirstNames.length || !this.maleLastNames.length) {
          throw new Error("One or more name lists are empty");
        }

        this.errorMessage = "";
      } catch (error) {
        this.errorMessage = `Failed to load names: ${error.message}`;
      }
    },

    getRandomName(array) {
      return array[Math.floor(Math.random() * array.length)];
    },

    handleAddRandomFirstName() {
      if (!this.selectedGender) {
        this.errorMessage = 'Bitte wählen Sie ein Geschlecht aus.';
        return;
      }

      const nameArray = this.selectedGender === 'male' ? this.maleFirstNames : this.femaleFirstNames;
      const randomName = this.getRandomName(nameArray);
      this.randomFirstNames.push(randomName);
    },

    handleAddRandomLastName() {
      if (!this.selectedGender) {
        this.errorMessage = 'Bitte wählen Sie ein Geschlecht aus.';
        return;
      }

      const nameArray = this.selectedGender === 'male' ? this.maleLastNames : this.femaleLastNames;
      const randomName = this.getRandomName(nameArray);
      this.randomLastNames.push(randomName);
    },

    handleAddRandomFullName() {
      if (!this.selectedGender) {
        this.errorMessage = 'Bitte wählen Sie ein Geschlecht aus.';
        return;
      }

      const firstNames = this.selectedGender === 'male' ? this.maleFirstNames : this.femaleFirstNames;
      const lastNames = this.selectedGender === 'male' ? this.maleLastNames : this.femaleLastNames;
      
      const firstName = this.getRandomName(firstNames);
      const lastName = this.getRandomName(lastNames);
      
      this.randomFullNames.push(`${firstName} ${lastName}`);
    },

    removeName(type, index) {
      switch (type) {
        case 'firstName':
          this.randomFirstNames.splice(index, 1);
          break;
        case 'lastName':
          this.randomLastNames.splice(index, 1);
          break;
        case 'fullName':
          this.randomFullNames.splice(index, 1);
          break;
      }
    },

    handleDragStart(nameData, event) {
      event.dataTransfer.setData('text/plain', JSON.stringify(nameData));
    },

    handleDrop(event) {
      const rect = this.$refs.imageCard.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const nameData = JSON.parse(event.dataTransfer.getData('text/plain'));
      
      this.droppedNames.push({
        ...nameData,
        x,
        y,
        displayText: nameData.name
      });
    },

    toggleImage() {
      this.showOriginal = !this.showOriginal;
    },

    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('validation', 'true');

      try {
        const response = await fetch(`${API_URL}/process-file/`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) throw new Error('Upload failed');

        const data = await response.json();
        this.processedImageUrl = data.processed_file_url;
        this.originalImageUrl = data.original_image_url;
        this.uploadedFile = file;
        
        if (data.gender_pars) {
          this.selectedGender = data.gender_pars.toLowerCase();
        }

        this.errorMessage = '';
      } catch (error) {
        this.errorMessage = `Upload failed: ${error.message}`;
      }
    },

    async saveAnnotation() {
      if (!this.canSubmit) return;

      const annotationData = {
        image_name: this.uploadedFile?.name,
        original_image_url: this.originalImageUrl,
        processed_image_url: this.processedImageUrl,
        dropped_names: this.droppedNames.map(({ name, type, x, y }) => ({
          name,
          type,
          x,
          y
        }))
      };

      try {
        const response = await fetch(`${API_URL}/annotations/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': this.getCookie('csrftoken')
          },
          body: JSON.stringify(annotationData)
        });

        if (!response.ok) throw new Error('Failed to save annotation');

        this.$emit('annotation-saved', await response.json());
        this.resetForm();
      } catch (error) {
        this.errorMessage = `Failed to save: ${error.message}`;
      }
    },

    getCookie(name) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
    },

    resetForm() {
      this.randomFirstNames = [];
      this.randomLastNames = [];
      this.randomFullNames = [];
      this.droppedNames = [];
      this.uploadedFile = null;
      this.processedImageUrl = null;
      this.originalImageUrl = null;
      this.showOriginal = false;
      this.errorMessage = '';
    }
  },
  async created() {
    await this.loadNames();
  }
};
</script>

<style scoped>
.dropped-name {
  position: absolute;
  font-weight: bold;
  color: #000;
  background-color: rgba(255, 255, 255, 0.7);
  padding: 2px 4px;
  border-radius: 3px;
  cursor: move;
  z-index: 100;
}

.image-container {
  position: relative;
  min-height: 200px;
  border: 2px dashed #ccc;
  margin-bottom: 20px;
}

.image-container.dragover {
  border-color: #007bff;
  background-color: rgba(0, 123, 255, 0.1);
}

/* Name List Styles */
.name-list {
  margin-top: 1rem;
}

.name-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.name-item div {
  font-weight: bold;
}
</style>
