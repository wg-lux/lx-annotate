<template>
  <main class="container-fluid py-4 model-chat">
    <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
      <div>
        <h1 class="h3">KI-Chat</h1>
        <p class="text-muted mb-0">
          Allgemeiner Chat mit lokalen Ollama-Modellen. Der Verlauf wird nur in diesem Fenster
          gehalten und nicht gespeichert. Bitte keine Patientendaten eingeben.
        </p>
      </div>
      <div
        v-if="chat.servers.value.length"
        class="d-flex align-items-center gap-2"
      >
        <label
          class="form-label mb-0"
          for="chat-model-select"
        >
          Modell
        </label>
        <select
          id="chat-model-select"
          class="form-select form-select-sm"
          data-testid="chat-model-select"
          :value="selectionValue"
          :disabled="chat.sending.value"
          @change="onModelChange"
        >
          <optgroup
            v-for="server in chat.servers.value"
            :key="server.id"
            :label="server.ready ? server.label : `${server.label} (nicht erreichbar)`"
          >
            <option
              v-for="model in server.models"
              :key="`${server.id}::${model}`"
              :value="`${server.id}::${model}`"
            >
              {{ model }}
            </option>
          </optgroup>
        </select>
      </div>
    </div>

    <div
      v-if="chat.modelsError.value"
      class="alert alert-warning py-2"
      role="alert"
      data-testid="chat-models-error"
    >
      {{ chat.modelsError.value }}
    </div>

    <section
      class="card"
      aria-label="Chatverlauf"
    >
      <div
        class="card-body chat-log"
        role="log"
        aria-live="polite"
        data-testid="chat-log"
      >
        <p
          v-if="!chat.messages.value.length"
          class="text-muted mb-0"
        >
          Noch keine Nachrichten.
        </p>
        <div
          v-for="(message, index) in chat.messages.value"
          :key="index"
          class="chat-message"
          :class="`chat-message-${message.role}`"
        >
          <span class="chat-role">{{ message.role === 'user' ? 'Sie' : 'Modell' }}</span>
          <p class="chat-text mb-0">{{ message.content }}</p>
        </div>
        <div
          v-if="chat.sending.value"
          class="text-muted"
          role="status"
        >
          <span
            class="spinner-border spinner-border-sm me-2"
            aria-hidden="true"
          ></span>
          Antwort wird erstellt…
        </div>
      </div>
      <div
        v-if="chat.error.value"
        class="alert alert-danger py-2 mx-3"
        role="alert"
        data-testid="chat-error"
      >
        {{ chat.error.value }}
      </div>
      <form
        class="card-footer d-flex gap-2 align-items-end"
        @submit.prevent="submit"
      >
        <label
          class="visually-hidden"
          for="chat-input"
        >
          Nachricht
        </label>
        <textarea
          id="chat-input"
          v-model="draft"
          class="form-control"
          rows="2"
          maxlength="8000"
          placeholder="Nachricht eingeben (Strg+Enter zum Senden)"
          data-testid="chat-input"
          :disabled="chat.limitReached.value"
          @keydown.ctrl.enter.prevent="submit"
        ></textarea>
        <button
          class="btn btn-primary"
          type="submit"
          data-testid="chat-send"
          :disabled="chat.sending.value || chat.limitReached.value || !draft.trim()"
        >
          Senden
        </button>
        <button
          class="btn btn-outline-secondary"
          type="button"
          data-testid="chat-clear"
          :disabled="!chat.messages.value.length && !chat.sending.value"
          @click="chat.clear"
        >
          Neuer Chat
        </button>
      </form>
      <p
        v-if="chat.limitReached.value"
        class="small text-muted px-3 pb-2 mb-0"
      >
        Der Verlauf ist voll. Bitte einen neuen Chat beginnen.
      </p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useModelChat } from '@/composables/useModelChat'

const chat = useModelChat()
const draft = ref('')

const selectionValue = computed(() => {
  const chosen = chat.selection.value
  return chosen ? `${chosen.server}::${chosen.model}` : ''
})

function onModelChange(event: Event) {
  if (!(event.target instanceof HTMLSelectElement)) {
    return
  }
  const value = event.target.value
  const separator = value.indexOf('::')
  if (separator > 0) {
    chat.select(value.slice(0, separator), value.slice(separator + 2))
  }
}

async function submit() {
  const text = draft.value
  const previous = draft.value
  draft.value = ''
  const accepted = await chat.send(text)
  // Restore the text only when the request failed, so it is not lost.
  if (!accepted && chat.error.value) {
    draft.value = previous
  }
}

onMounted(() => {
  void chat.loadModels()
})
</script>

<style scoped>
.chat-log {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-height: 45vh;
  max-height: 60vh;
  overflow-y: auto;
}

.chat-message {
  max-width: min(46rem, 90%);
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--lx-border);
  border-radius: var(--lx-corner-radius);
}

.chat-message-user {
  align-self: flex-end;
  background: var(--lx-teal-soft);
}

.chat-message-assistant {
  align-self: flex-start;
  background: var(--lx-surface);
}

.chat-role {
  display: block;
  margin-bottom: 0.2rem;
  color: var(--lx-ink-muted);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.chat-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--lx-ink);
}
</style>
