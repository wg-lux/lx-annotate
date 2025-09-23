# Agent Review Tool — Vue 3 + Pinia + Vitest

Ein systematisches DX/QA-Review-Tool für Vue 3 + Pinia + Vitest Test-Setups mit strukturierter JSON-Schema-Bewertung.

## 🎯 Features

- **Automatisierte Artefakt-Sammlung**: Vitest JSON, Coverage Reports, Fail-Logs, Setup-Snippets
- **Strukturierte Agent-Analyse**: JSON-Schema-basierte Bewertung mit Scoring-Algorithmus
- **Präzise Problem-Identifikation**: Kategorisierte Findings mit Evidence und Impact-Analyse
- **Actionable Fixes**: Minimale Patches mit ETA und Dependency-Tracking
- **Dual CLI**: TypeScript (Node) und Python Implementierung

## 📁 Struktur

```
tools/agent-review/
├── README.md                 # Diese Dokumentation
├── agent-spec.md            # Präzise Agent-Prompt-Spezifikation
├── examples/                # Beispiel-Artefakte und -Outputs
│   ├── vitest-example.json
│   ├── coverage-example.json
│   └── agent-output-example.json
├── cli/                     # CLI Implementierungen
│   ├── node/               # TypeScript/Node CLI
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── cli.ts
│   │       ├── collect.ts
│   │       ├── validate.ts
│   │       └── schema.ts
│   └── python/             # Python CLI (single file)
│       └── agent_cli.py
└── scripts/                # Convenience scripts
    ├── full-review.sh      # End-to-end review workflow
    └── validate-setup.sh   # Test setup validation
```

## 🚀 Quick Start

### Option A: Vollautomatischer Workflow

```bash
# End-to-end Review in einem Schritt
bash tools/agent-review/scripts/full-review.sh

# Dann: LLM mit build/prompt.txt laufen lassen → agent_output.json speichern
# Validieren: python3 tools/agent-review/cli/python/agent_cli.py validate --output agent_output.json
```

### Option B: Manuelle Schritte

### 1. Artefakte sammeln

```bash
# Vitest JSON Report generieren
npx vitest run --reporter=json > vitest.json

# Coverage Report (optional)
npx vitest run --coverage
# → erzeugt coverage/coverage-summary.json

# Python CLI verwenden
python3 tools/agent-review/cli/python/agent_cli.py collect \
  --vitest vitest.json \
  --coverage coverage/coverage-summary.json \
  --faillog fail.log \
  --snippets setup_snippets.txt
```

### 2. Agent-Prompt generieren

```bash
python3 tools/agent-review/cli/python/agent_cli.py prompt
# → build/prompt.txt
```

### 3. Agent-Analyse durchführen

Verwende den generierten Prompt mit deinem LLM und speichere die Antwort als `agent_output.json`.

### 4. Output validieren

```bash
# Mit eigenem Agent-Output (nachdem LLM gelaufen ist)
python3 tools/agent-review/cli/python/agent_cli.py validate \
  --output agent_output.json

# Demo mit Beispiel-Output
python3 tools/agent-review/cli/python/agent_cli.py validate \
  --output tools/agent-review/examples/agent-output-example.json
```

## 📋 Agent-Spec Schema

Das Tool verwendet ein präzises JSON-Schema für strukturierte Reviews:

```json
{
  "summary": "Kurze 6-Satz Zusammenfassung",
  "scores": {
    "pass_rate_pct": 72.73,
    "coverage_lines_pct": 71.11,
    "setup_correctness_pct": 65,
    "determinism_pct": 60,
    "overall_pct": 67.95
  },
  "verdict": "pass | soft-fail | fail | blocked",
  "findings": [{
    "id": "F1",
    "category": "pinia-setup",
    "severity": "high",
    "evidence": "konkreter Beleg aus Artefakten",
    "impact": "warum es Tests bricht",
    "fix": {
      "type": "minimal-patch",
      "patch": "≤25 Zeilen Code-Fix",
      "notes": "Hinweise/Alternativen"
    }
  }],
  "actions": [{
    "priority": 1,
    "title": "Implementiere createTestingPinia",
    "eta_minutes": 15,
    "depends_on": [],
    "details": "konkrete Umsetzung"
  }]
}
```

## 🎯 Bewertungskriterien

### Scoring-Algorithmus
- **overall_pct** = 0.30×pass_rate + 0.25×coverage_lines + 0.25×setup_correctness + 0.20×determinism

### setup_correctness_pct (max 100)
- +30: Globale Provider korrekt (Pinia, Router, etc.)
- +25: Gemeinsames mount utility
- +25: Kein vi.mock Hoisting-Problem
- +20: Deterministische Store-Mocks

### determinism_pct (max 100)
- +40: Statische Mocks (keine Random/Time-Dependencies)
- +30: Keine Zeit/Zufall-Flakes
- +30: Konsistente Test-Fixtures

### Verdict
- **blocked**: Kritische Artefakte fehlen
- **fail**: overall < 60%
- **soft-fail**: 60-79.99%
- **pass**: ≥ 80%

## 🔧 CLI Reference

### Python CLI

```bash
# Artefakte sammeln
python3 agent_cli.py collect \
  [--vitest vitest.json] \
  [--coverage coverage/coverage-summary.json] \
  [--faillog fail.log] \
  [--snippets setup.txt] \
  [--out build/artifacts.json]

# Prompt generieren
python3 agent_cli.py prompt \
  [--artifacts build/artifacts.json] \
  [--out build/prompt.txt]

# Output validieren
python3 agent_cli.py validate --output agent_output.json
```

### TypeScript CLI

```bash
# Setup (einmalig)
cd tools/agent-review/cli/node
npm install

# Verwendung
ts-node src/cli.ts collect [options]
ts-node src/cli.ts prompt [options]
ts-node src/cli.ts validate --output agent_output.json
```

## 📝 Kategorien & Findings

### Supported Categories
- **pinia-setup**: Store-Provider, createTestingPinia, initialState
- **vi.mock-hoisting**: Module-Hoisting, Top-level mocks
- **global-providers**: Mount-Konfiguration, Plugins, Stubs
- **coverage**: Test-Coverage, ungetestete Branches
- **determinism**: Flaky tests, Time/Random dependencies
- **other**: Sonstige Setup-Probleme

### Severity Levels
- **high**: Kritische Probleme die Tests brechen
- **medium**: Wichtige Verbesserungen für Stabilität
- **low**: Nice-to-have Optimierungen

## 🎭 Beispiel-Workflow

```bash
#!/bin/bash
# full-review.sh - Kompletter Review-Workflow

echo "🧪 Running tests with JSON output..."
npx vitest run --reporter=json > vitest.json

echo "📊 Generating coverage report..."
npx vitest run --coverage --silent >/dev/null 2>&1

echo "📋 Collecting artifacts..."
python3 tools/agent-review/cli/python/agent_cli.py collect \
  --vitest vitest.json \
  --coverage coverage/coverage-summary.json

echo "🤖 Generating agent prompt..."
python3 tools/agent-review/cli/python/agent_cli.py prompt

echo "📝 Prompt ready at: build/prompt.txt"
echo "📤 Run your LLM with this prompt and save output as agent_output.json"
echo "✅ Then validate with: python3 tools/agent-review/cli/python/agent_cli.py validate --output agent_output.json"
```

## 💡 Best Practices

### Artefakt-Qualität sicherstellen
- **Vitest JSON**: `npx vitest run --reporter=json` (robusteste Methode)
- **Coverage**: Nutze `coverage/coverage-summary.json` (Istanbul), nicht text-parsing
- **Fail-Logs**: `npx vitest run --reporter=verbose 2>&1 | tee fail.log`
- **Setup-Snippets**: Relevante Ausschnitte aus mount utils, vi.mock blocks

### Häufige Probleme
- **Worker Module Error**: Versuche `npx vitest run` statt `npm run test:unit`
- **Leere JSON Files**: Prüfe ob Tests tatsächlich laufen
- **Bash Shebang**: Nutze `bash script.sh` statt `./script.sh` in Nix-Umgebungen

### Agent-Prompting
- Verwende die generierte `build/prompt.txt` exakt
- Agent soll **nur** JSON zurückgeben (kein zusätzlicher Text)
- Bei Schema-Fehlern: erneut prompten mit Fehlermeldung

### Integration in CI/CD
```yaml
# .github/workflows/test-review.yml
- name: Generate test review
  run: |
    npm run test:unit -- --reporter=json > vitest.json
    python3 tools/agent-review/cli/python/agent_cli.py collect
    python3 tools/agent-review/cli/python/agent_cli.py prompt
    # LLM API call hier
    python3 tools/agent-review/cli/python/agent_cli.py validate --output agent_output.json
```

## 🔗 Vue 3 + Pinia Spezifika

### Typische Findings
- **createTestingPinia vs vi.mock()**: Store-Mock-Integration
- **initialState**: Deterministische Store-Zustände
- **Global Mount**: Pinia Provider in mount() config
- **Hoisting**: vi.mock() Positionierung für Vitest

### Lösungspatterns
```typescript
// ✅ Correct: createTestingPinia mit initialState
const pinia = createTestingPinia({
  initialState: {
    patient: { patients: [...] },
    examination: { examinations: [...] }
  }
});

// ❌ Problematic: vi.mock() für Pinia stores
vi.mock('@/stores/patientStore', () => ({ ... }));
```

## 📈 Erfolgsmetriken

- **Pass Rate**: >90% für production-ready tests
- **Coverage**: >80% Lines/Statements
- **Setup Correctness**: >80% (korrekte Provider, utils, mocks)
- **Determinism**: >90% (keine Flakes, statische fixtures)
- **Overall Score**: >80% für "pass" verdict

Das Tool hilft dabei, diese Metriken systematisch zu erreichen und zu überwachen.
