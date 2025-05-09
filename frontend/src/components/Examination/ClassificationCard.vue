<template>
    <div class="classification-card" :class="{ 'compact-mode': compact }">
      <h5 class="card-title">{{ label }}</h5>
      <div v-if="compact" class="compact-summary">
        <div class="selected-items">
          <div v-if="selectedLabels.length" class="selected-tags">
            <span v-for="item in selectedLabels" :key="item.id" class="selected-tag">
              {{ item.name }}
              <button type="button" class="remove-btn" @click="removeItem(item.id)">×</button>
            </span>
          </div>
          <div v-else class="no-selection">Keine Auswahl</div>
        </div>
        
        <div class="selection-controls" v-if="options.length > 0">
          <select v-model="localTempValue" class="form-select">
            <option :value="undefined" disabled>{{ selectPrompt }}</option>
            <option 
              v-for="option in availableOptions" 
              :key="option.id" 
              :value="option.id"
            >
              {{ option.name }}
            </option>
          </select>
          <button 
            type="button" 
            class="btn btn-sm btn-primary add-btn" 
            :disabled="!localTempValue" 
            @click="addSelected"
          >
            Hinzufügen
          </button>
        </div>
      </div>
      
      <div v-else class="full-selection">
        <div v-if="isSingleSelection" class="radio-group">
          <div v-for="option in options" :key="option.id" class="form-check">
            <input 
              type="radio" 
              :id="`${label}-${option.id}`" 
              :value="option.id" 
              v-model="singleSelectedValue"
              class="form-check-input"
            />
            <label :for="`${label}-${option.id}`" class="form-check-label">{{ option.name }}</label>
          </div>
        </div>
        <div v-else class="checkbox-group">
          <div v-for="option in options" :key="option.id" class="form-check">
            <input 
              type="checkbox" 
              :id="`${label}-${option.id}`" 
              :value="option.id" 
              v-model="localModelValue"
              class="form-check-input"
            />
            <label :for="`${label}-${option.id}`" class="form-check-label">{{ option.name }}</label>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script lang="ts">
import { defineComponent, computed, ref, watch } from 'vue';
import type { PropType } from 'vue';
  
export  interface Option {
    id: number;
    name: string;
  }
  
  export default defineComponent({
    name: 'ClassificationCard',
    
    props: {
      label: {
        type: String,
        required: true
      },
      options: {
        type: Array as PropType<Option[]>,
        default: () => []
      },
      modelValue: {
        type: Array as PropType<number[]>,
        default: () => []
      },
      tempValue: {
        type: Number,
        default: undefined
      },
      compact: {
        type: Boolean,
        default: false
      },
      singleSelect: {
        type: Boolean,
        default: false
      }
    },
  
    emits: ['update:modelValue', 'update:tempValue'],
    
    setup(props, { emit }) {
      const localModelValue = computed({
        get: () => props.modelValue,
        set: (value) => emit('update:modelValue', value)
      });
  
      const localTempValue = computed({
        get: () => props.tempValue,
        set: (value) => emit('update:tempValue', value)
      });
  
      const singleSelectedValue = computed({
        get: () => props.modelValue.length ? props.modelValue[0] : null,
        set: (value) => {
          if (value === null) {
            emit('update:modelValue', []);
          } else {
            emit('update:modelValue', [value]);
          }
        }
      });
  
      const isSingleSelection = computed(() => props.singleSelect);
  
      const selectedLabels = computed(() => {
        return props.options.filter(option => props.modelValue.includes(option.id));
      });
  
      const availableOptions = computed(() => {
        return props.options.filter(option => !props.modelValue.includes(option.id));
      });
  
      const selectPrompt = computed(() => {
        return `${props.label} auswählen...`;
      });
  
      const addSelected = () => {
        if (localTempValue.value) {
          if (isSingleSelection.value) {
            emit('update:modelValue', [localTempValue.value]);
          } else {
            const updatedValues = [...localModelValue.value, localTempValue.value];
            emit('update:modelValue', updatedValues);
          }
          emit('update:tempValue', undefined);
        }
      };
  
      const removeItem = (id: number) => {
        const updatedValues = localModelValue.value.filter(item => item !== id);
        emit('update:modelValue', updatedValues);
      };
  
      return {
        localModelValue,
        localTempValue,
        singleSelectedValue,
        isSingleSelection,
        selectedLabels,
        availableOptions,
        selectPrompt,
        addSelected,
        removeItem
      };
    }
  });
  </script>
  
  <style scoped>
  .classification-card {
    border: 1px solid #dee2e6;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1rem;
    background-color: #f8f9fa;
  }
  
  .compact-mode {
    width: 300px;
  }
  
  .card-title {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 1.1rem;
    font-weight: 600;
    color: #495057;
  }
  
  .compact-summary {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .selected-items {
    min-height: 2.5rem;
    margin-bottom: 0.5rem;
  }
  
  .no-selection {
    color: #6c757d;
    font-style: italic;
    padding: 0.25rem 0;
  }
  
  .selected-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .selected-tag {
    display: inline-flex;
    align-items: center;
    background-color: #e2e8f0;
    color: #1a202c;
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
  }
  
  .remove-btn {
    background: none;
    border: none;
    color: #4a5568;
    font-size: 1rem;
    margin-left: 0.25rem;
    padding: 0 0.25rem;
    cursor: pointer;
  }
  
  .remove-btn:hover {
    color: #e53e3e;
  }
  
  .selection-controls {
    display: flex;
    gap: 0.5rem;
  }
  
  .form-select {
    flex-grow: 1;
  }
  
  .add-btn {
    white-space: nowrap;
  }
  
  .full-selection {
    margin-top: 0.5rem;
  }
  
  .radio-group, 
  .checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .form-check {
    display: flex;
    align-items: center;
    margin-bottom: 0.25rem;
  }
  
  .form-check-input {
    margin-right: 0.5rem;
  }
  </style>