<template>
  <div class="card mt-3 border-danger-subtle">
    <div class="card-header d-flex justify-content-between align-items-center">
      <h6 class="mb-0">
        <i class="fas fa-exclamation-triangle text-danger me-2"></i>
        Nicht erfüllte Anforderungen
      </h6>
      <span v-if="totalUnmet > 0" class="badge bg-danger">{{ totalUnmet }}</span>
    </div>

    <div class="card-body">
      <!-- Top-level backend errors -->
      <div v-if="payload?.errors?.length" class="alert alert-warning">
        <strong>Hinweise aus der Auswertung:</strong>
        <ul class="mb-0">
          <li v-for="(e, i) in payload!.errors" :key="i">{{ e }}</li>
        </ul>
      </div>

      <div v-if="totalUnmet === 0" class="text-muted">
        <i class="fas fa-check-circle me-1 text-success"></i>
        Alle Anforderungen sind erfüllt.
      </div>

      <div v-else class="d-flex flex-column gap-3">
        <div
          v-for="(group, key) in unmetBySet"
          :key="key"
          class="border rounded p-3"
        >
          <div class="d-flex justify-content-between align-items-center mb-2">
            <strong>
              <i class="fas fa-layer-group me-2 text-secondary"></i>
              {{ group.setName }}
            </strong>
            <span class="badge bg-danger">{{ group.items.length }}</span>
          </div>
          <ul class="list-unstyled mb-0">
            <li v-for="(item, idx) in group.items" :key="idx" class="mb-2">
              <div class="d-flex align-items-start gap-2">
                <i class="fas fa-times-circle text-danger mt-1"></i>
                <div>
                  <div class="fw-semibold">{{ item.requirement_name }}</div>
                  <div class="small text-muted">
                    {{ item.details || 'Nicht erfüllt' }}
                  </div>
                  <div v-if="item.error" class="small text-danger mt-1">
                    <i class="fas fa-bug me-1"></i>{{ item.error }}
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <!-- Meta footer -->
        <div class="text-muted small">
          <i class="fas fa-info-circle me-1"></i>
          {{ payload?.meta?.requirementsEvaluated ?? 0 }} geprüft,
          {{ totalUnmet }} nicht erfüllt · Status: {{ payload?.meta?.status || 'unknown' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { EvaluateRequirementsResponse } from '@/types/api/evaluateRequirements';

const props = defineProps<{
  payload: EvaluateRequirementsResponse | null
  unmetBySet: Record<string, {
    setId: number | null;
    setName: string;
    items: EvaluateRequirementsResponse['results'];
  }>
}>();

const totalUnmet = computed(() => {
  if (!props.unmetBySet) return 0;
  return Object.values(props.unmetBySet).reduce((acc, g) => acc + g.items.length, 0);
});

const payload = computed(() => props.payload);
</script>

<style scoped>
.border-danger-subtle { border-color: rgba(220,53,69,.25) !important; }
</style>
