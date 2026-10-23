<template>
  <div
    v-if="state === 'error'"
    class="remote-machine-selector"
    data-test="remote-machines-unavailable"
    title="Die Rechnerliste ist derzeit nicht verfügbar"
  >
    <span class="badge bg-warning text-dark">Remote !</span>
  </div>
  <form
    v-else-if="registry && registry.machines.length > 0"
    class="remote-machine-selector"
    data-test="remote-machine-selector"
    @submit.prevent="switchMachine"
  >
    <span
      class="badge remote-machine-role"
      :class="registry.deploymentRole === 'central_hub' ? 'bg-info' : 'bg-secondary'"
      data-test="remote-machine-local-role"
    >
      {{ ROLE_LABELS[registry.deploymentRole] }}
    </span>
    <label
      class="visually-hidden"
      for="remote-machine-select"
    >
      Rechner im VPN auswählen
    </label>
    <select
      id="remote-machine-select"
      v-model="selectedKey"
      class="form-select form-select-sm"
      data-test="remote-machine-select"
    >
      <option
        v-for="machine in registry.machines"
        :key="machine.key"
        :value="machine.key"
      >
        {{ machine.displayName }} ({{ ROLE_LABELS[machine.deploymentRole] }}){{
          machine.baseUrl === currentOrigin ? ' – aktuell' : ''
        }}
      </option>
    </select>
    <button
      type="submit"
      class="btn btn-outline-primary btn-sm mb-0"
      :disabled="!selectedMachine || selectedMachine.baseUrl === currentOrigin"
      data-test="remote-machine-switch"
    >
      Wechseln
    </button>
  </form>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  fetchRemoteMachines,
  type DeploymentRole,
  type RemoteMachineRegistry
} from '@/api/remoteMachinesApi'
import { createRuntimeLogger } from '@/utils/runtimeLogger'

const ROLE_LABELS: Readonly<Record<DeploymentRole, string>> = {
  central_hub: 'Hub',
  site_node: 'Standort',
  local_study_server: 'Studienserver',
  standalone: 'Einzelplatz'
}

const logger = createRuntimeLogger('remote-machine-selector')
const currentOrigin = window.location.origin
const registry = ref<RemoteMachineRegistry | null>(null)
const state = ref<'loading' | 'ready' | 'error'>('loading')
const selectedKey = ref('')
const controller = new AbortController()

const selectedMachine = computed(
  () => registry.value?.machines.find((machine) => machine.key === selectedKey.value) ?? null
)

function switchMachine(): void {
  const machine = selectedMachine.value
  if (!machine || machine.baseUrl === currentOrigin) return
  // Full navigation: the target serves its own SPA and Keycloak session.
  window.location.assign(`${machine.baseUrl}/`)
}

onMounted(async () => {
  try {
    const result = await fetchRemoteMachines(controller.signal)
    registry.value = result
    const current = result.machines.find((machine) => machine.baseUrl === currentOrigin)
    selectedKey.value = current?.key ?? (result.machines.length > 0 ? result.machines[0].key : '')
    state.value = 'ready'
  } catch (error) {
    if (controller.signal.aborted) return
    logger.error('remote-machines-load-failed', error)
    state.value = 'error'
  }
})

onBeforeUnmount(() => {
  controller.abort()
})
</script>

<style scoped>
.remote-machine-selector {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.remote-machine-selector .form-select {
  min-width: 11rem;
}
</style>
