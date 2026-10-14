<template>
  <fieldset class="mt-4">
    <legend class="h6">Studienprotokoll</legend>
    <p class="text-sm">
      Alle Einschlusskriterien müssen erfüllt sein; Referenzen innerhalb eines Kriteriums sind
      Alternativen. Altersgruppen gelten einschließlich ihrer Grenzen in vollendeten Jahren am
      Untersuchungsbeginn. Fehlende Alters- oder Versionsangaben schließen eine Untersuchung bei
      entsprechenden Kriterien aus.
    </p>
    <h6>Teilnehmende Zentren</h6>
    <div
      v-for="(center, index) in model.participatingCenters"
      :key="index"
      class="d-flex gap-2 mb-2"
    >
      <label
        >Zentrumsschlüssel
        <input
          v-model="center.centerKey"
          class="form-control"
          required
      /></label>
      <label
        >Name
        <input
          v-model="center.name"
          class="form-control"
          required
      /></label>
      <button
        type="button"
        class="btn btn-link"
        @click="model.participatingCenters.splice(index, 1)"
      >
        Entfernen
      </button>
    </div>
    <button
      type="button"
      class="btn btn-outline-secondary btn-sm"
      @click="model.participatingCenters.push({ centerKey: '', name: '' })"
    >
      Zentrum hinzufügen
    </button>

    <h6 class="mt-3">Altersgruppen</h6>
    <div
      v-for="(group, index) in model.ageGroups"
      :key="index"
      class="d-flex gap-2 mb-2"
    >
      <label
        >Name
        <input
          v-model="group.name"
          class="form-control"
          required
      /></label>
      <label
        >Mindestalter
        <input
          v-model.number="group.minimumAge"
          class="form-control"
          type="number"
          min="0"
          max="150"
          required
      /></label>
      <label
        >Höchstalter (optional)
        <input
          :value="group.maximumAge"
          class="form-control"
          type="number"
          min="0"
          max="150"
          @input="setMaximumAge(index, $event)"
      /></label>
      <button
        type="button"
        class="btn btn-link"
        @click="model.ageGroups.splice(index, 1)"
      >
        Entfernen
      </button>
    </div>
    <button
      type="button"
      class="btn btn-outline-secondary btn-sm"
      @click="model.ageGroups.push({ name: '', minimumAge: 0, maximumAge: null })"
    >
      Altersgruppe hinzufügen
    </button>

    <h6 class="mt-3">Erforderliche Terminologieversionen</h6>
    <div
      v-for="(requirement, index) in model.terminologyRequirements"
      :key="index"
      class="d-flex gap-2 mb-2"
    >
      <label
        >Modul
        <input
          v-model="requirement.module"
          class="form-control"
          required
      /></label>
      <label
        >Exakte Version
        <input
          v-model="requirement.version"
          class="form-control"
          required
      /></label>
      <button
        type="button"
        class="btn btn-link"
        @click="model.terminologyRequirements.splice(index, 1)"
      >
        Entfernen
      </button>
    </div>
    <button
      type="button"
      class="btn btn-outline-secondary btn-sm"
      @click="model.terminologyRequirements.push({ module: '', version: '' })"
    >
      Terminologie hinzufügen
    </button>

    <h6 class="mt-3">Einschlusskriterien</h6>
    <div
      v-for="(criterion, index) in model.inclusionCriteria"
      :key="index"
      class="border rounded p-3 mb-2"
    >
      <label class="d-block"
        >Name
        <input
          v-model="criterion.name"
          class="form-control"
          required
      /></label>
      <label class="d-block"
        >Beschreibung
        <textarea
          v-model="criterion.description"
          class="form-control"
        ></textarea>
      </label>
      <div
        v-for="(concept, conceptIndex) in criterion.concepts"
        :key="conceptIndex"
        class="d-flex flex-wrap gap-2 mt-2"
      >
        <label
          >Modul
          <input
            v-model="concept.module"
            class="form-control"
            required
        /></label>
        <label
          >Version
          <input
            v-model="concept.version"
            class="form-control"
            required
        /></label>
        <label
          >Typ
          <select
            v-model="concept.kind"
            class="form-select"
          >
            <option value="finding">Befund</option>
            <option value="examination">Untersuchung</option>
          </select></label
        >
        <label
          >Terminologiename
          <input
            v-model="concept.name"
            class="form-control"
            required
        /></label>
        <button
          type="button"
          class="btn btn-link"
          @click="criterion.concepts.splice(conceptIndex, 1)"
        >
          Referenz entfernen
        </button>
      </div>
      <button
        type="button"
        class="btn btn-outline-secondary btn-sm mt-2"
        @click="criterion.concepts.push({ module: '', version: '', kind: 'finding', name: '' })"
      >
        Referenz hinzufügen
      </button>
      <button
        type="button"
        class="btn btn-link"
        @click="model.inclusionCriteria.splice(index, 1)"
      >
        Kriterium entfernen
      </button>
    </div>
    <button
      type="button"
      class="btn btn-outline-secondary btn-sm"
      @click="model.inclusionCriteria.push({ name: '', description: '', concepts: [] })"
    >
      Kriterium hinzufügen
    </button>
  </fieldset>
</template>

<script setup lang="ts">
import type { StudyMetadata } from '@/api/studyCohortApi'

const model = defineModel<StudyMetadata>({ required: true })

function setMaximumAge(index: number, event: Event): void {
  const group = model.value.ageGroups[index]
  if (!(event.target instanceof HTMLInputElement)) return
  group.maximumAge = event.target.value === '' ? null : event.target.valueAsNumber
}
</script>
