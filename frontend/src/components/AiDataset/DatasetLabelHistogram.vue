<template>
  <section
    class="card mb-4"
    aria-labelledby="histogram-heading"
  >
    <div class="card-body">
      <h2
        id="histogram-heading"
        class="h5"
      >
        Label-Präsenz im Datensatz
      </h2>
      <p class="text-muted small">
        Eindeutige Frames mit positivem Label aus Annotationen und Segmentbereichen für die
        aktuellen Anzeigefilter. Ein Frame kann mehrere Labels tragen; Balken sind nicht additiv.
      </p>
      <p
        v-if="rows.length === 0"
        class="text-muted"
      >
        Keine Label-Frames vorhanden.
      </p>
      <div
        v-else
        class="histogram"
        data-test="label-histogram"
        role="list"
        aria-label="Frames pro Label"
      >
        <div
          v-for="row in rows"
          :key="row.labelId"
          class="histogram-row"
          role="listitem"
        >
          <span class="fw-semibold">{{ row.labelName }}</span>
          <div
            class="progress"
            aria-hidden="true"
          >
            <div
              class="progress-bar bg-primary"
              :style="{ width: `${String((row.frameCount / maximum) * 100)}%` }"
            ></div>
          </div>
          <span>{{ row.frameCount.toLocaleString('de-DE') }} Frames</span>
        </div>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import type { AiDatasetLabelFrameBucketCount } from '@/api/aiDatasetApi'
const props = defineProps<{ rows: AiDatasetLabelFrameBucketCount[] }>()
const maximum = computed(() => Math.max(1, ...props.rows.map((row) => row.frameCount)))
</script>
<style scoped>
.histogram {
  display: grid;
  gap: 0.8rem;
}
.histogram-row {
  display: grid;
  grid-template-columns: minmax(8rem, 1fr) minmax(8rem, 3fr) 7rem;
  align-items: center;
  gap: 1rem;
}
.histogram-row > span:first-child {
  overflow-wrap: anywhere;
}
.progress {
  height: 1.5rem;
  background: #eef2f6;
}
@media (max-width: 600px) {
  .histogram-row {
    grid-template-columns: 1fr 7rem;
  }
  .progress {
    grid-row: 2;
    grid-column: 1 / -1;
  }
}
</style>
