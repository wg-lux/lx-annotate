<template>
  <div class="card mb-4 shadow-sm" :class="{ 'border-primary': isActive }">
    <div 
      class="card-header p-3 cursor-pointer d-flex align-items-center justify-content-between"
      @click="isExpanded = !isExpanded"
    >
      <div class="d-flex align-items-center">
        <div :class="['icon icon-shape shadow-sm border-radius-md me-3', iconBgClass]">
          <i class="material-icons opacity-10">{{ icon }}</i>
        </div>
        <div>
          <h6 class="mb-0 text-dark">{{ title }}</h6>
          <p class="text-xs mb-0 text-secondary">{{ subtitle }}</p>
        </div>
      </div>
      
      <div class="d-flex align-items-center">
        <span v-if="isComplete" class="badge badge-sm bg-gradient-success me-3">Abgeschlossen</span>
        <i class="material-icons transition-all" :style="expandStyle">expand_more</i>
      </div>
    </div>

    <div v-show="isExpanded" class="collapse show">
      <hr class="dark horizontal my-0">
      <div class="card-body medical-block-scroll">
        <slot :store="store" :params="extraParams"></slot>
        
        <div v-if="showAction" class="d-flex justify-content-end mt-3">
          <button 
            class="btn btn-sm bg-gradient-dark mb-0" 
            :disabled="loading || !isComplete"
            @click="$emit('next')"
          >
            {{ actionLabel }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps({
  title: String,
  subtitle: String,
  icon: String,
  iconBgClass: { type: String, default: 'bg-gradient-info' },
  store: Object, // The specific Pinia store (patientStore, findingStore, etc.)
  isComplete: Boolean,
  isActive: Boolean,
  extraParams: Object,
  actionLabel: { type: String, default: 'Weiter' },
  showAction: { type: Boolean, default: true },
  loading: Boolean
});

const isExpanded = ref(props.isActive);
const expandStyle = computed(() => ({
  transform: isExpanded.value ? 'rotate(180deg)' : 'rotate(0deg)',
  transition: 'transform 0.3s ease'
}));
</script>

<style>
.medical-block-scroll {
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 10px;
}

/* Material Dashboard 3 Custom Scrollbar */
.medical-block-scroll::-webkit-scrollbar {
  width: 4px;
}
.medical-block-scroll::-webkit-scrollbar-thumb {
  background: #e9ecef;
  border-radius: 10px;
}

</style>