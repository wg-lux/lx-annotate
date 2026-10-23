<template>
  <fieldset class="border rounded p-2 my-2">
    <legend class="h6">{{ label }}</legend>
    <select
      v-model="model.mode"
      class="form-select"
      aria-label="Regelverknüpfung"
    >
      <option value="all">Alle Bedingungen</option>
      <option value="any">Mindestens eine Bedingung</option>
    </select>
    <div
      v-for="(predicate, index) in model.predicates"
      :key="index"
      class="row g-2 my-2"
    >
      <label class="col-md-3"
        >Rolle<select
          v-model="predicate.role"
          class="form-select"
        >
          <option value="index">Indexbefund</option>
          <option value="polyp">Polyp</option>
          <option value="previous_follow_up">Vorherige Kontrolle</option>
          <option value="follow_up">Kontrolle</option>
        </select></label
      >
      <label class="col-md-3"
        >Klassifikation<input
          v-model="predicate.classification"
          class="form-control"
          required
      /></label>
      <label class="col-md-3"
        >Deskriptor (optional)<input
          v-model="predicate.descriptor"
          class="form-control"
      /></label>
      <label class="col-md-3"
        >Operator<select
          v-model="predicate.operator"
          class="form-select"
          @change="resetValue(predicate)"
        >
          <option value="eq">gleich</option>
          <option value="ne">ungleich</option>
          <option value="ge">≥</option>
          <option value="gt">&gt;</option>
          <option value="le">≤</option>
          <option value="lt">&lt;</option>
          <option value="in">in Auswahl</option>
          <option value="present">vorhanden</option>
        </select></label
      >
      <label
        v-if="predicate.operator === 'eq' || predicate.operator === 'ne'"
        class="col-md-3"
        >Werttyp
        <select
          :value="typeof predicate.value"
          class="form-select"
          @change="setValueType(predicate, $event)"
        >
          <option value="string">Auswahl / Text</option>
          <option value="number">Zahl</option>
          <option value="boolean">Wahrheitswert</option>
        </select>
      </label>
      <label
        v-if="predicate.operator !== 'present'"
        class="col-md-9"
        >{{ predicate.operator === 'in' ? 'Auswahlwerte (ein Wert pro Zeile)' : 'Wert' }}
        <textarea
          v-if="predicate.operator === 'in'"
          :value="displayValue(predicate)"
          class="form-control"
          @input="setValue(predicate, $event)"
        ></textarea>
        <select
          v-else-if="typeof predicate.value === 'boolean'"
          v-model="predicate.value"
          class="form-select"
        >
          <option :value="true">Ja</option>
          <option :value="false">Nein</option>
        </select>
        <input
          v-else
          :value="displayValue(predicate)"
          :type="numeric(predicate) || typeof predicate.value === 'number' ? 'number' : 'text'"
          step="any"
          class="form-control"
          required
          @input="setValue(predicate, $event)"
        />
      </label>
      <button
        type="button"
        class="btn btn-link col-md-3"
        @click="model.predicates.splice(index, 1)"
      >
        Bedingung entfernen
      </button>
    </div>
    <button
      type="button"
      class="btn btn-outline-secondary btn-sm"
      data-test="add-predicate"
      @click="
        model.predicates.push({
          role: 'index',
          classification: '',
          descriptor: null,
          operator: 'eq',
          value: ''
        })
      "
    >
      Bedingung hinzufügen
    </button>
  </fieldset>
</template>
<script setup lang="ts">
import type { StudyPredicate, StudyRule } from '@/api/studyCohortApi'
defineProps<{ label: string }>()
const model = defineModel<StudyRule>({ required: true })
function numeric(predicate: StudyPredicate): boolean {
  return ['ge', 'gt', 'le', 'lt'].includes(predicate.operator)
}
function displayValue(predicate: StudyPredicate): string {
  return Array.isArray(predicate.value) ? predicate.value.join('\n') : String(predicate.value ?? '')
}
function resetValue(predicate: StudyPredicate): void {
  predicate.value =
    predicate.operator === 'present'
      ? null
      : predicate.operator === 'in'
        ? []
        : numeric(predicate)
          ? 0
          : ''
}
function setValueType(predicate: StudyPredicate, event: Event): void {
  if (!(event.target instanceof HTMLSelectElement)) return
  predicate.value =
    event.target.value === 'number' ? 0 : event.target.value === 'boolean' ? false : ''
}
function setValue(predicate: StudyPredicate, event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return
  predicate.value =
    predicate.operator === 'in'
      ? target.value.split('\n').filter(Boolean)
      : numeric(predicate) || typeof predicate.value === 'number'
        ? target.value === ''
          ? null
          : Number(target.value)
        : target.value
}
</script>
