<script setup lang="ts">
defineProps<{
  completedSections: number
  totalSections: number
  missingRequiredCount: number
  wordCount: number
}>()
</script>

<template>
  <div
    v-if="totalSections"
    class="report-readiness-strip mb-3"
  >
    <div class="readiness-item is-primary">
      <span class="readiness-label">Vollständigkeit</span>
      <strong class="readiness-value"> {{ completedSections }}/{{ totalSections }} </strong>
    </div>
    <div
      class="readiness-item"
      :class="{ 'has-warning': missingRequiredCount > 0 }"
    >
      <span class="readiness-label">Noch offen</span>
      <strong class="readiness-value">{{ missingRequiredCount }}</strong>
    </div>
    <div class="readiness-item">
      <span class="readiness-label">Bericht</span>
      <strong class="readiness-value">{{ wordCount }} Wörter</strong>
    </div>
  </div>
</template>

<style scoped>
.report-readiness-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.readiness-item {
  min-width: 0;
  padding: 0.75rem;
  border: 1px solid #d9e0ea;
  border-radius: 8px;
  background: #f8fafc;
}

.readiness-item.is-primary {
  color: #fff;
  background: #172234;
  border-color: #172234;
}

.readiness-item.has-warning {
  color: #842029;
  background: #f8d7da;
  border-color: #f5c2c7;
}

.readiness-item .readiness-label {
  display: block;
  margin-bottom: 0.2rem;
  color: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.78;
}

.readiness-item .readiness-value {
  display: block;
  overflow-wrap: anywhere;
  line-height: 1.25;
}

@media (max-width: 575.98px) {
  .report-readiness-strip {
    grid-template-columns: 1fr;
  }
}
</style>
