<template>
  <section
    class="card p-4"
    aria-label="Meine Annotationsvergleiche"
  >
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h3 class="h5 mb-0">Meine Annotationen im Vergleich</h3>
      <button
        class="btn btn-outline-primary btn-sm"
        :disabled="loading"
        @click="load(page)"
      >
        Aktualisieren
      </button>
    </div>
    <p class="text-muted">
      Vergleich mit benannten Annotatoren auf denselben Videos und mit finalisierten Berichten
      derselben Untersuchung. Zeitüberlappung = gemeinsame positive Label-Zeit geteilt durch die
      gesamte positive Label-Zeit beider Annotatoren. Mehrere Labels zählen getrennt. Fehlende
      Annotationen sind keine negativen Befunde.
    </p>
    <p
      v-if="loading"
      role="status"
    >
      Vergleiche werden geladen …
    </p>
    <p
      v-else-if="error"
      role="alert"
    >
      {{ error }}
    </p>
    <template v-else-if="data">
      <p>
        Annotator: <strong>{{ data.practitioner }}</strong> · {{ data.count }} Videos
      </p>
      <p v-if="!data.results.length">
        Noch keine zugeordneten menschlichen Annotationen auf zugänglichen Videos vorhanden.
      </p>
      <article
        v-for="video in data.results"
        :key="video.video"
        class="border-top pt-3 mb-3"
      >
        <h4 class="h6">Video {{ video.video }}</h4>
        <p
          v-if="video.conflicts"
          role="status"
        >
          {{ video.conflicts }} widersprüchliche Frame-Label-Zuordnungen wurden ausgeschlossen.
        </p>
        <div
          v-if="video.annotations.length"
          class="table-responsive"
        >
          <table class="table table-sm">
            <caption>
              Vergleich der vorhandenen Annotationen
            </caption>
            <thead>
              <tr>
                <th>Annotator</th>
                <th>Gemeinsam bewertet</th>
                <th>Label-Übereinstimmung</th>
                <th>Zeitüberlappung</th>
                <th>Gemeinsam / Gesamt</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="peer in video.annotations"
                :key="peer.practitioner"
              >
                <td>{{ peer.practitioner }}</td>
                <td>{{ peer.shared }} Frame-Label-Paare</td>
                <td>{{ percent(peer.agreement) }} ({{ peer.agreeing }}/{{ peer.shared }})</td>
                <td>
                  {{ percent(peer.overlap)
                  }}<span v-if="peer.missing"> · {{ peer.missing }} ohne Zeitnachweis</span>
                </td>
                <td>{{ seconds(peer.intersection) }} / {{ seconds(peer.union) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else>Keine Annotationen anderer Praktizierender für dieses Video vorhanden.</p>
        <div
          v-if="video.findings.length"
          class="table-responsive"
        >
          <table class="table table-sm">
            <caption>
              Befundvergleich anhand der hinterlegten Label-Zuordnung; keine Aussage über
              diagnostische Richtigkeit.
            </caption>
            <thead>
              <tr>
                <th>Praktizierende</th>
                <th>Quelle</th>
                <th>Übereinstimmung</th>
                <th>Gemeinsame Befunde</th>
                <th>Nur meine</th>
                <th>Nur andere</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(finding, index) in video.findings"
                :key="index"
              >
                <td>{{ finding.practitioner }}</td>
                <td>
                  {{
                    finding.kind === 'report'
                      ? `Finalisierter Bericht ${finding.report}`
                      : 'Annotationen'
                  }}
                </td>
                <td>{{ percent(finding.overlap) }}</td>
                <td>{{ finding.matching.join(', ') || '—' }}</td>
                <td>{{ finding.own.join(', ') || '—' }}</td>
                <td>{{ finding.other.join(', ') || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else>Kein auswertbarer Befundvergleich vorhanden.</p>
        <p v-if="video.unmapped.length">
          Labels ohne Befundzuordnung: {{ video.unmapped.join(', ') }}
        </p>
        <p
          v-for="reason in video.unavailable"
          :key="reason"
          class="text-muted"
        >
          {{ reasons[reason] ?? 'Ein Teil des Befundvergleichs ist nicht auswertbar.' }}
        </p>
      </article>
      <nav
        v-if="data.pages > 1"
        aria-label="Vergleichsseiten"
        class="d-flex gap-3 align-items-center"
      >
        <button
          class="btn btn-outline-primary btn-sm"
          :disabled="page <= 1"
          @click="load(page - 1)"
        >
          Zurück
        </button>
        <span>Seite {{ data.page }} von {{ data.pages }}</span>
        <button
          class="btn btn-outline-primary btn-sm"
          :disabled="page >= data.pages"
          @click="load(page + 1)"
        >
          Weiter
        </button>
      </nav>
    </template>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import axios from '@/api/axiosInstance'
import { r } from '@/api/axiosInstance'
import type { components } from '@/types/generated/endoreg-api'

type ComparisonPage = components['schemas']['ComparisonPage']

const data = ref<ComparisonPage | null>(null)
const loading = ref(false)
const error = ref('')
const page = ref(1)
const reasons: Record<string, string> = {
  no_mapped_positive_findings:
    'Keine eigenen positiven Befunde mit hinterlegter Label-Zuordnung vorhanden.',
  peer_without_mapped_positive_findings:
    'Ein Annotator ohne zuordenbare positive Befunde wurde vom Befundvergleich ausgeschlossen.',
  missing_examination: 'Keine Untersuchung zugeordnet.',
  missing_terminology: 'Keine versionierte Terminologie für den Befundvergleich vorhanden.',
  missing_mapping: 'Keine Label-zu-Befund-Zuordnung vorhanden.',
  report_missing_attribution_or_snapshot:
    'Bericht ohne Finalisierer oder historischen Befundstand ausgeschlossen.',
  report_terminology_mismatch: 'Bericht mit abweichender Terminologie ausgeschlossen.'
}
const percent = (value: number | null): string =>
  value === null ? 'Nicht auswertbar' : `${value.toFixed(1)} %`
const seconds = (value: number | null): string => (value === null ? '—' : `${value.toFixed(2)} s`)

async function load(target: number): Promise<void> {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const response = await axios.get<ComparisonPage>(r('media/annotations/comparisons/'), {
      params: { page: target }
    })
    if (!Array.isArray(response.data.results)) throw new Error('Invalid comparison response')
    data.value = response.data
    page.value = response.data.page
  } catch {
    data.value = null
    error.value = 'Annotationsvergleiche konnten nicht geladen werden. Bitte erneut versuchen.'
  } finally {
    loading.value = false
  }
}
onMounted(() => load(1))
</script>
