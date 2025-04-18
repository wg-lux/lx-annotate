<template>
  <div class="container-fluid py-4">
    <div class="row">
      <div class="col-12 bg-light mb-4">
        <div class="overflow-auto" style="max-height: 80vh;">
          <DynamicScroller :items="frames" :min-item-size="150" key-field="id" v-slot="{ item }">
            <DynamicScrollerItem :item="item">
              <!-- Container for each frame: relative to position overlay elements -->
              <div class="frame-item position-relative">
                <img :src="item.imageUrl" alt="Frame" class="img-fluid">
                
                <!-- Overlay predicted segments on top of the image -->
                <div 
                  v-for="segment in getSegmentsForFrame(item.id)" 
                  :key="segment.id"
                  class="segment-overlay" 
                  :style="getSegmentStyle(segment, item.duration || 10)"
                  @click="selectSegment(segment, item)"
                >
                  <span class="segment-label">
                    {{ getTranslationForLabel(segment.label) }}
                  </span>
                </div>

                <!-- Button to trigger annotation for the frame -->
                <button 
                  class="btn btn-primary btn-sm mt-2"
                  @click="annotateFrame(item)"
                >
                  Annotieren
                </button>
              </div>
            </DynamicScrollerItem>
          </DynamicScroller>
        </div>
      </div>
    </div>

    <!-- Optional modal for annotations -->
    <div v-if="showAnnotationModal" class="modal fade show" tabindex="-1" 
         style="display: block; background-color: rgba(0,0,0,0.5);">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Frame annotieren</h5>
            <button type="button" class="btn-close" @click="showAnnotationModal = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="selectedFrame">
              <img :src="selectedFrame.imageUrl" alt="Selected Frame" class="img-fluid mb-3">
              
              <div class="mb-3">
                <label class="form-label">Label</label>
                <select v-model="newSegment.label" class="form-select">
                  <option v-for="(translation, label) in translationMap" :key="label" :value="label">
                    {{ translation }}
                  </option>
                </select>
              </div>
              
              <div class="row mb-3">
                <div class="col">
                  <label class="form-label">Startzeit (s)</label>
                  <input type="number" v-model.number="newSegment.startTime" class="form-control" min="0">
                </div>
                <div class="col">
                  <label class="form-label">Endzeit (s)</label>
                  <input type="number" v-model.number="newSegment.endTime" class="form-control" min="0">
                </div>
                <div class="col">
                  <label class="form-label">Konfidenz (%)</label>
                  <input type="number" v-model.number="newSegment.avgConfidence" class="form-control" min="0" max="1" step="0.1">
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showAnnotationModal = false">Abbrechen</button>
            <button type="button" class="btn btn-primary" @click="saveNewSegment">Speichern</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import { useImageStore } from '@/stores/imageStore';
import type { ImageData } from '@/stores/imageStore';
import { 
  getSegmentStyle,
  getTranslationForLabel,
  getColorForLabel,
  useLabelStore
} from '@/stores/labelStore';
import type { Segment } from '@/stores/labelStore';

export default defineComponent({
  name: 'ScrollingFrames',
  components: {
    DynamicScroller,
    DynamicScrollerItem,
  },
  setup() {
    // Stores
    const imageStore = useImageStore();
    const labelStore = useLabelStore();

    // UI state
    const showAnnotationModal = ref(false);
    const selectedFrame = ref<ImageData | null>(null);
    const newSegment = ref<Segment>({
      id: 'segment-' + Math.random().toString(36).substr(2, 9),
      label: 'outside',
      startTime: 0,
      endTime: 1,
      avgConfidence: 1,
      frameId: ''
    });

    // Translation map for the dropdown
    const translationMap = computed(() => {
      const map: Record<string, string> = {};
      ['appendix', 'blood', 'diverticule', 'grasper', 'ileocaecalvalve', 'ileum', 
       'low_quality', 'nbi', 'needle', 'outside', 'polyp', 'snare', 'water_jet', 'wound']
        .forEach(label => {
          map[label] = getTranslationForLabel(label);
        });
      return map;
    });

    // Fetch frames and segments on component mount
    onMounted(async () => {
      try {
        await imageStore.fetchImages();
        await labelStore.fetchSegments();
      } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
      }
    });

    const frames = computed(() => imageStore.data);

    // Function to annotate a frame
    const annotateFrame = (frame: ImageData) => {
      selectedFrame.value = frame;
      newSegment.value = {
        id: 'segment-' + Math.random().toString(36).substr(2, 9),
        label: 'outside',
        startTime: 0,
        endTime: 10,
        avgConfidence: 1,
        frameId: frame.id
      };
      showAnnotationModal.value = true;
    };

    // Function to select a segment (for editing)
    const selectSegment = (segment: Segment, frame: ImageData) => {
      selectedFrame.value = frame;
      newSegment.value = { ...segment };
      showAnnotationModal.value = true;
    };

    // Save the new segment
    const saveNewSegment = async () => {
      try {
        if (selectedFrame.value) {
          newSegment.value.frameId = selectedFrame.value.id;
          await labelStore.saveSegment(newSegment.value);
          showAnnotationModal.value = false;
        }
      } catch (error) {
        console.error('Fehler beim Speichern des Segments:', error);
      }
    };

    return {
      frames,
      annotateFrame,
      selectSegment,
      getSegmentStyle,
      getTranslationForLabel,
      getColorForLabel,
      getSegmentsForFrame: labelStore.getSegmentsForFrame,
      showAnnotationModal,
      selectedFrame,
      newSegment,
      saveNewSegment,
      translationMap
    };
  },
});
</script>

<style scoped>
.frame-item {
  margin-bottom: 10px;
  text-align: center;
  position: relative; /* important for overlay positioning */
}

.segment-overlay {
  position: absolute;
  top: 0;
  height: 100%;
  opacity: 0.5;
  cursor: pointer;
}

.segment-label {
  position: absolute;
  bottom: 0;
  left: 0;
  background: rgba(255,255,255,0.8);
  font-size: 0.8rem;
  padding: 2px 4px;
}

.true {
  background-color: green;
}

.false {
  background-color: red;
}
</style>