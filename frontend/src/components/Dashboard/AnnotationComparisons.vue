<template>
  <section
    id="annotation-comparisons"
    class="comparison-panel"
    aria-label="Annotationsvergleiche"
  >
    <div class="comparison-heading">
      <div>
        <p class="eyebrow">Aktivität &amp; Vergleich</p>
        <h3 class="h4 mb-0">Annotationsübersicht</h3>
      </div>
      <button
        class="btn btn-outline-primary btn-sm"
        :disabled="loading"
        @click="load(page)"
      >
        Aktualisieren
      </button>
    </div>
    <details class="comparison-help">
      <summary>Metrikdefinitionen</summary>
      <p>
        Vergleich mit benannten Annotatoren auf denselben Videos und mit finalisierten Berichten
        derselben Untersuchung. Zeitüberlappung = gemeinsame positive Label-Zeit geteilt durch die
        gesamte positive Label-Zeit beider Annotatoren. Mehrere Labels zählen getrennt. Fehlende
        Annotationen sind keine negativen Befunde.
      </p>
    </details>
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
      <div class="progress-grid">
        <article class="progress-card contribution-card">
          <div class="contribution-heading">
            <p class="eyebrow">Annotationskonto · {{ data.practitioner }}</p>
            <span
              class="level-badge"
              data-test="annotation-level"
              >Stufe {{ level }}</span
            >
          </div>
          <strong class="metric">{{ data.total.toLocaleString('de-DE') }}</strong>
          <h4>Annotationen insgesamt</h4>
          <p>
            {{ data.count }} Videos · Eindeutige Frame-Label-Paare, einschließlich Annotationen aus
            Segmentvalidierung.
          </p>
          <label for="video-milestone">Nächster Meilenstein: {{ milestone }} Annotationen</label>
          <progress
            id="video-milestone"
            :value="data.total"
            :max="milestone"
          />
          <p>{{ milestone - data.total }} weitere Annotationen bis zum nächsten Meilenstein.</p>
        </article>
        <article
          v-for="summary in summaries"
          :key="summary.kind"
          class="progress-card"
        >
          <p class="eyebrow">
            {{ summary.kind === 'annotations' ? 'Annotatoren' : 'KI-Vorhersagen' }}
          </p>
          <strong
            class="metric"
            :data-test="summary.kind === 'annotations' ? 'peer-overlap' : 'ai-overlap'"
            >{{ percent(summary.overlap) }}</strong
          >
          <h4>
            {{
              summary.kind === 'annotations'
                ? 'Zeitüberlappung mit anderen'
                : 'Zeitüberlappung mit KI'
            }}
          </h4>
          <meter
            v-if="summary.overlap !== null"
            min="0"
            max="100"
            :value="summary.overlap"
            :aria-label="
              summary.kind === 'annotations'
                ? 'Zeitüberlappung mit anderen in Prozent'
                : 'Zeitüberlappung mit KI in Prozent'
            "
          />
          <p>Gewichtet nach positiver Label-Zeit, über auswertbare Vergleiche dieser Seite.</p>
          <p>
            {{ summary.count }} auswertbare
            {{ summary.kind === 'annotations' ? 'Video-Annotator-Paare' : 'Video-KI-Lauf-Paare' }} ·
            Seite {{ data.page }} von {{ data.pages }}
          </p>
        </article>
      </div>

      <section
        class="achievement-panel"
        aria-label="Annotationsmeilensteine"
      >
        <div class="achievement-heading">
          <div>
            <p class="eyebrow">Meilensteine</p>
            <h4>Annotationsvolumen</h4>
          </div>
          <span class="achievement-count"
            >{{ level }} erreicht · Nächstes Ziel {{ milestone.toLocaleString('de-DE') }}</span
          >
        </div>
        <ol class="achievement-track">
          <li
            v-for="target in visibleMilestones"
            :key="target"
            class="achievement"
            :class="{ 'is-earned': data.total >= target, 'is-next': target === milestone }"
            :aria-current="target === milestone ? 'step' : undefined"
          >
            <span
              class="achievement-icon"
              aria-hidden="true"
              >{{ data.total >= target ? '✓' : '◇' }}</span
            >
            <strong>{{ target.toLocaleString('de-DE') }}</strong>
            <span>{{
              data.total >= target
                ? 'Erreicht'
                : target === milestone
                  ? 'Nächstes Ziel'
                  : 'Gesperrt'
            }}</span>
          </li>
        </ol>
      </section>

      <p v-if="!data.results.length">
        Noch keine zugeordneten menschlichen Annotationen auf zugänglichen Videos vorhanden.
      </p>
      <article
        v-for="video in data.results"
        :key="video.video"
        class="video-comparison"
      >
        <h4 class="h6">Video {{ video.video }} · Vergleich im Detail</h4>
        <p
          v-if="video.conflicts"
          role="status"
        >
          {{ video.conflicts }} widersprüchliche Frame-Label-Zuordnungen wurden ausgeschlossen.
        </p>
        <div
          v-for="kind in comparisonKinds"
          :key="kind"
          class="table-responsive"
        >
          <h5 class="h6">
            {{ kind === 'annotations' ? 'Andere Annotatoren' : 'KI-Segmente nach Vorhersagelauf' }}
          </h5>
          <table
            v-if="video[kind].length"
            class="table table-sm"
          >
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
                v-for="peer in video[kind]"
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
          <p v-else>
            {{
              kind === 'annotations'
                ? 'Keine Annotationen anderer Praktizierender für dieses Video vorhanden.'
                : 'Keine KI-Segmente für dieses Video vorhanden.'
            }}
          </p>
        </div>
        <div
          v-if="video.findings.length"
          class="table-responsive"
        >
          <table class="table table-sm">
            <caption>
              Befundvergleich anhand der hinterlegten Label-Zuordnung.
            </caption>
            <thead>
              <tr>
                <th>Praktizierende</th>
                <th>Quelle</th>
                <th>Übereinstimmung</th>
                <th>Gemeinsame Befunde</th>
                <th>Nur Referenzkonto</th>
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
import { computed, onMounted, ref } from 'vue'
import axios from '@/api/axiosInstance'
import { r } from '@/api/axiosInstance'
import type { components } from '@/types/generated/endoreg-api'

type ComparisonPage = components['schemas']['ComparisonPage']

const data = ref<ComparisonPage | null>(null)
const loading = ref(false)
const error = ref('')
const page = ref(1)
const milestoneTargets = [10, 50, 100, 500, 1000]
const milestone = computed(() => {
  const count = data.value?.total ?? 0
  return milestoneTargets.find((target) => target > count) ?? (Math.floor(count / 1000) + 1) * 1000
})
const level = computed(() => {
  const total = data.value?.total ?? 0
  return (
    milestoneTargets.filter((target) => total >= target).length +
    Math.max(0, Math.floor(total / 1000) - 1)
  )
})
const visibleMilestones = computed(() =>
  milestone.value > 1000
    ? [
        ...milestoneTargets,
        ...(milestone.value > 2000 ? [milestone.value - 1000] : []),
        milestone.value
      ]
    : milestoneTargets
)
const comparisonKinds = ['annotations', 'predictions'] as const
const summaries = computed(() =>
  comparisonKinds.map((kind) => {
    const peers = (data.value?.results ?? [])
      .flatMap((video) => video[kind])
      .filter((peer) => peer.intersection !== null && peer.union !== null && peer.union > 0)
    const union = peers.reduce((total, peer) => total + (peer.union ?? 0), 0)
    return {
      kind,
      count: peers.length,
      overlap:
        union > 0
          ? (100 * peers.reduce((total, peer) => total + (peer.intersection ?? 0), 0)) / union
          : null
    }
  })
)
const reasons: Record<string, string> = {
  prediction_missing_label: 'KI-Segmente ohne Label wurden vom Vergleich ausgeschlossen.',
  no_mapped_positive_findings:
    'Keine eigenen positiven Befunde mit hinterlegter Label-Zuordnung vorhanden.',
  peer_without_mapped_positive_findings:
    'Ein Annotator ohne zuordenbare positive Befunde wurde vom Befundvergleich ausgeschlossen.',
  missing_examination: 'Keine Untersuchung zugeordnet.',
  missing_terminology: 'Keine versionierte Terminologie für den Befundvergleich vorhanden.',
  missing_mapping: 'Keine Label-zu-Befund-Zuordnung vorhanden.',
  report_missing_attribution_or_snapshot:
    'Bericht ohne Finalisierung oder historischen Befundstand ausgeschlossen.',
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
    if (
      !Array.isArray(response.data.results) ||
      !Number.isSafeInteger(response.data.total) ||
      response.data.total < 0 ||
      response.data.results.some((video) => !Array.isArray(video.predictions))
    ) {
      throw new Error('Invalid comparison response')
    }
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

<style scoped>
.comparison-panel {
  padding: clamp(1rem, 3vw, 2rem);
  background: #fff;
  border: 1px solid #dfe7ef;
  border-radius: 20px;
  box-shadow: 0 12px 36px #24354b08;
  scroll-margin-top: 2rem;
}
.comparison-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}
.eyebrow {
  color: #52647a;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}
.comparison-help {
  margin: 1.25rem 0;
  color: #52647a;
  font-size: 0.875rem;
}
.comparison-help summary {
  cursor: pointer;
  color: #254c87;
  font-weight: 600;
}
.comparison-help p {
  margin-top: 0.75rem;
  max-width: 85ch;
}
.progress-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}
.progress-card {
  padding: 1.5rem;
  border: 1px solid #dfe7ef;
  border-radius: 16px;
  background: #f7f9fc;
}
.contribution-card {
  background: linear-gradient(125deg, #edf5ff, #f2faf7);
}
.metric {
  display: block;
  font-size: clamp(1.8rem, 3vw, 2.75rem);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.04em;
  color: #1b425d;
  margin: 0.5rem 0;
}
.progress-card h4 {
  font-size: 1rem;
  color: #24354b;
}
.progress-card p,
.progress-card label {
  font-size: 0.85rem;
  color: #52647a;
}
.progress-card label {
  margin: 0;
}
progress,
meter {
  display: block;
  width: 100%;
  height: 0.65rem;
  margin: 0.75rem 0;
  accent-color: #247c76;
  border: 0;
  border-radius: 20px;
  overflow: hidden;
}
meter::-webkit-meter-bar {
  background: #dce7eb;
  border: 0;
}
meter::-webkit-meter-optimum-value {
  background: #486fa6;
}
meter::-moz-meter-bar {
  background: #486fa6;
}
progress::-webkit-progress-bar {
  background: #dce7eb;
}
progress::-webkit-progress-value {
  background: #247c76;
}
progress::-moz-progress-bar {
  background: #247c76;
}
.contribution-heading,
.achievement-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.contribution-heading .eyebrow {
  margin: 0;
}
.level-badge {
  padding: 0.35rem 0.65rem;
  background: #173b56;
  color: #fff;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}
.achievement-panel {
  margin: 1.5rem 0;
  padding: 1.5rem;
  border: 1px solid #dfe7ef;
  border-radius: 14px;
  background: #fbfcfe;
}
.achievement-heading h4 {
  margin: 0;
  color: #24354b;
  font-size: 1rem;
}
.achievement-count {
  color: #52647a;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}
.achievement-track {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 0.75rem;
  list-style: none;
  margin: 1.25rem 0 0;
  padding: 0;
}
.achievement {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 1rem 0.5rem;
  border: 1px dashed #b9c7d6;
  border-radius: 10px;
  color: #52647a;
  font-size: 0.75rem;
  text-align: center;
}
.achievement strong {
  font-size: 1.1rem;
  font-variant-numeric: tabular-nums;
}
.achievement-icon {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: #e8eef5;
  font-size: 1.1rem;
}
.achievement.is-earned {
  background: #edf7f3;
  border: 1px solid #9fc8b8;
  color: #215c47;
}
.is-earned .achievement-icon {
  background: #21664f;
  color: #fff;
}
.achievement.is-next {
  border: 2px solid #466da4;
  background: #eef4fc;
  color: #284d80;
}
@media (max-width: 600px) {
  .achievement-track {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.video-comparison {
  padding-top: 1.5rem;
  margin-top: 1rem;
  border-top: 1px solid #dfe7ef;
}
.table th {
  color: #52647a;
  font-size: 0.75rem;
}
.table td {
  font-size: 0.875rem;
}
.table caption {
  color: #52647a;
  font-size: 0.8rem;
}
summary:focus-visible,
button:focus-visible {
  outline: 3px solid #315b9b;
  outline-offset: 4px;
}
@media (max-width: 1000px) {
  .progress-grid {
    grid-template-columns: 1fr;
  }
}
</style>
