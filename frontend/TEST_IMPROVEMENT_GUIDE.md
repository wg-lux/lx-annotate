# Agent-Review Workflow für Test-Verbesserung

## 1. LLM mit aktuellem Prompt ausführen

```bash
# Nimm den bestehenden prompt.txt und füttere ihn einem LLM
# Speichere die Antwort als agent_output.json
```

**Beispiel LLM-Antwort** (du bekommst strukturierte JSON-Analyse):
```json
{
  "summary": "Vue 3 + Pinia Test-Suite mit Store-Integration-Problemen...",
  "scores": {
    "pass_rate_pct": 72.73,
    "coverage_lines_pct": 71.11,
    "setup_correctness_pct": 65,
    "determinism_pct": 60,
    "overall_pct": 67.95
  },
  "verdict": "soft-fail",
  "findings": [{
    "id": "F1",
    "category": "pinia-setup", 
    "severity": "high",
    "evidence": "vi.mock() static mocks don't integrate with component's Pinia store instances",
    "impact": "Store mock data not reaching component",
    "fix": {
      "type": "minimal-patch",
      "patch": "Replace vi.mock() with createTestingPinia initialState",
      "notes": "15-line fix to fix 3 failing tests"
    }
  }],
  "actions": [{
    "priority": 1,
    "title": "Implementiere createTestingPinia",
    "eta_minutes": 15,
    "depends_on": [],
    "details": "Konkrete Fix-Schritte..."
  }]
}
```

## 2. Strukturierte Validierung

```bash
cd /home/admin/dev/lx-annotate/frontend

# Validiere die LLM-Antwort
python3 tools/agent-review/cli/python/agent_cli.py validate \
  --output agent_output.json

# Du bekommst:
# ✅ Schema valid 
# 📊 Score breakdown
# 🎯 Priorisierte Action Items
```

## 3. Fixes implementieren (Beispiel aus deiner aktuellen Situation)

### Fix 1: Store-Integration Problem lösen

**Problem**: `vi.mock()` erreicht Komponente nicht
**Lösung**: createTestingPinia mit initialState

```typescript
// ❌ Aktuell: vi.mock() (hoisting issues)
vi.mock('@/stores/patientStore', () => ({ ... }))

// ✅ Fix: createTestingPinia
import { createTestingPinia } from '@pinia/testing'

const wrapper = mount(RequirementGenerator, {
  global: {
    plugins: [createTestingPinia({
      initialState: {
        patient: {
          patients: [
            { id: 1, displayName: 'John Doe' },
            { id: 2, displayName: 'Jane Smith' }
          ],
          isLoading: false
        }
      }
    })]
  }
})
```

### Fix 2: V-If Conditional Rendering

**Problem**: Button state ändert sich nicht bei `v-if="condition"`
**Lösung**: `await nextTick()` nach State-Updates

```typescript
// ✅ Fix: Async State Updates handhaben
import { nextTick } from 'vue'

it('should enable button when both selected', async () => {
  await wrapper.find('[data-testid="patient-select"]').setValue(1)
  await wrapper.find('[data-testid="exam-select"]').setValue(1)
  await nextTick()  // 🔑 Wichtig für v-if updates
  
  expect(wrapper.find('[data-testid="create-button"]').attributes().disabled).toBeUndefined()
})
```

## 4. Fortschritt messen

```bash
# Nach Fixes: Neue Messung
npx vitest run --reporter=json > vitest_improved.json
npx vitest run --coverage

# Neuen Agent-Review durchführen
python3 tools/agent-review/cli/python/agent_cli.py collect \
  --vitest vitest_improved.json \
  --coverage coverage/coverage-summary.json \
  --out build/artifacts_improved.json

python3 tools/agent-review/cli/python/agent_cli.py prompt \
  --artifacts build/artifacts_improved.json \
  --out build/prompt_improved.txt
```

## 5. Fortschritts-Vergleich

Du bekommst **messbare Verbesserungen**:

```diff
# Vorher → Nachher
- pass_rate_pct: 72.73  →  pass_rate_pct: 90.91
- overall_pct: 67.95    →  overall_pct: 82.45
- verdict: "soft-fail"  →  verdict: "pass"
```

## 6. Nächste Iteration

**Basierend auf verbessertem Agent-Output**:
- Neue High-Priority Findings
- Coverage-Lücken identifiziert
- Weitere 15-min Fixes vorgeschlagen

---

## 🎯 Systematische Coverage-Verbesserung

### A) Aktuelle Coverage-Lücken adressieren

```bash
# Coverage-Details anzeigen
npx vitest run --coverage --reporter=verbose

# Spezifische Dateien mit niedriger Coverage finden
npx vitest run --coverage --reporter=json | jq '.coverageMap'
```

### B) Missing Branches identifizieren

**Aktuell**: 66.67% Branch Coverage (8/12)
**Ziel**: >80%

```typescript
// Beispiel: Fehlende Error-Branches testen
it('should handle API errors', async () => {
  // Mock API failure
  vi.mocked(api.fetchPatients).mockRejectedValue(new Error('API Error'))
  
  await wrapper.vm.loadPatients()
  
  expect(wrapper.text()).toContain('Error loading patients')
})
```

### C) Uncovered Functions testen

**Aktuell**: 75% Function Coverage (6/8)
**Ziel**: >85%

```typescript
// Edge cases für uncovered functions
it('should handle empty patient list', () => {
  const store = usePatientStore()
  store.patients = []
  
  expect(wrapper.find('select option').length).toBe(1) // only disabled option
})
```

---

## 📈 **Kontinuierliche Verbesserung**

### Weekly Review Cycle

```bash
#!/bin/bash
# weekly-test-review.sh

echo "📊 Weekly Test Review..."

# 1. Vollständige Suite ausführen
npx vitest run --reporter=json > weekly_vitest.json
npx vitest run --coverage

# 2. Agent-Review generieren
python3 tools/agent-review/cli/python/agent_cli.py collect \
  --vitest weekly_vitest.json \
  --coverage coverage/coverage-summary.json

python3 tools/agent-review/cli/python/agent_cli.py prompt

echo "📝 Review prompt ready at: build/prompt.txt"
echo "🤖 Run with LLM and save as agent_output.json"
echo "📊 Track progress week-over-week"
```

### Coverage-Ziele setzen

```json
// package.json - Coverage thresholds
{
  "scripts": {
    "test:coverage": "vitest run --coverage --reporter=json"
  },
  "vitest": {
    "coverage": {
      "thresholds": {
        "lines": 80,
        "functions": 85,
        "branches": 75,
        "statements": 80
      }
    }
  }
}
```

### Metriken tracken

```bash
# Erstelle Coverage-Trend-Log
echo "$(date): Pass Rate $(jq '.numPassedTests/.numTotalTests*100' vitest.json)%" >> test_progress.log
echo "$(date): Line Coverage $(jq '.total.lines.pct' coverage/coverage-summary.json)%" >> test_progress.log
```

---

## 🚀 **Sofort umsetzbare nächste Schritte**

1. **LLM mit aktuellem Prompt füttern** → `agent_output.json`
2. **Erste Pinia-Fix implementieren** (15 min)
3. **Re-run tests** → neue Messung  
4. **Coverage-Lücken identifizieren** 
5. **Wöchentlichen Review-Cycle einrichten**

Das agent-review Tool macht Test-Verbesserung **systematisch und messbar** - perfekt für kontinuierliche Qualitätssteigerung!
