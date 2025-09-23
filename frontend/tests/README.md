# LX-Annotate Frontend Test Suite

Eine umfassende Test-Suite für die Vue 3 + TypeScript Frontend-Anwendung mit Vitest, Vue Test Utils und JSDOM.

## 🚀 Schnellstart

```bash
# Tests ausführen
npm run test:unit

# Tests im Watch-Modus
npx vitest

# Coverage-Report generieren
npx vitest run --coverage

# Spezifische Test-Datei ausführen
npx vitest run tests/components/Timeline.spec.ts
```

## 📁 Test-Struktur

```
tests/
├── components/          # Vue Component Tests
│   ├── DraftIndicator.test.ts
│   ├── DraftManager.test.ts
│   ├── DraftSystemIntegration.test.ts
│   ├── RequirementReport/
│   ├── Timeline.spec.ts
│   └── VideoExamination/
├── stores/             # Pinia Store Tests
├── unit/               # Unit Tests
│   └── FileDropZone.spec.ts
├── utils/              # Utility Function Tests
├── setup.ts            # Test Setup & Mocks
└── simple.test.ts      # Basis-Test für Setup-Validation
```

## ⚙️ Konfiguration

### Vitest Config (`vitest.config.ts`)

```typescript
export default defineConfig({
  root: __dirname,              // Frontend-spezifisches Root
  plugins: [vue(), vueJsx()],
  test: {
    environment: 'jsdom',       // DOM-Simulation
    globals: true,              // Globale Test-APIs
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true      // Monorepo-Worker-Fix
      }
    }
  }
})
```

### Setup (`tests/setup.ts`)

- **JSDOM Polyfills**: PointerEvent, getBoundingClientRect
- **Mock Utilities**: `mockRect()`, `mockCanvas()`
- **Global Test Helpers**

## 🧪 Test-Kategorien

### 1. Component Tests

**Zweck**: Vue-Komponenten isoliert testen
**Pattern**: Mount → Act → Assert

```typescript
import { mount } from '@vue/test-utils'
import Component from '@/components/Component.vue'

describe('Component', () => {
  it('should render correctly', () => {
    const wrapper = mount(Component)
    expect(wrapper.text()).toContain('Expected Text')
  })
})
```

**Aktuelle Tests**:
- ✅ `DraftIndicator` - Status-Anzeige
- ✅ `DraftManager` - Draft-Management
- ✅ `Timeline` - Video-Timeline-Komponente
- ❌ `RequirementReport` - Report-Generation (3 failing tests)

### 2. Store Tests

**Zweck**: Pinia Store State-Management testen
**Pattern**: Store Setup → Action → State Validation

```typescript
import { setActivePinia, createPinia } from 'pinia'
import { useMyStore } from '@/stores/myStore'

describe('MyStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should update state correctly', () => {
    const store = useMyStore()
    store.updateData('new value')
    expect(store.data).toBe('new value')
  })
})
```

### 3. Unit Tests

**Zweck**: Pure Functions und Utilities testen
**Pattern**: Input → Function → Output

```typescript
import { utilityFunction } from '@/utils/utilities'

describe('utilityFunction', () => {
  it('should transform data correctly', () => {
    const input = { raw: 'data' }
    const output = utilityFunction(input)
    expect(output).toEqual({ processed: 'data' })
  })
})
```

## 🔧 Agent-Review Integration

### Vollständige Test-Suite-Analyse

Das Projekt enthält ein **Agent-Review Tool** (`tools/agent-review/`) für automatisierte, strukturierte Test-Suite-Bewertungen:

```bash
# Vollständiger Test-Suite-Review
cd /home/admin/dev/lx-annotate/frontend
bash tools/agent-review/scripts/full-review.sh

# Generiert:
# - vitest.json (alle 208 Test Suites)
# - coverage/coverage-summary.json  
# - build/prompt.txt für LLM-Analyse
```

**Review-Kategorien:**
- **pinia-setup**: Store-Provider, createTestingPinia, initialState
- **vi.mock-hoisting**: Module-Hoisting, Top-level mocks  
- **global-providers**: Mount-Konfiguration, Plugins, Stubs
- **coverage**: Test-Coverage, ungetestete Branches
- **determinism**: Flaky tests, Time/Random dependencies

**Aktuelle Test-Suite-Metriken** (automatisch analysiert):
- 📊 **Pass Rate**: 62.5% (193/309 Tests)
- 📈 **Test Suites**: 73/208 bestanden
- 🎯 **Coverage**: Variable je nach Komponente
- 🔧 **Setup-Probleme**: Import-Resolution, Store-Integration

### Review-Workflow

```bash
# 1. Vollständige Datensammlung
npx vitest run --reporter=json > vitest.json
npx vitest run --coverage

# 2. Agent-Prompt generieren
python3 tools/agent-review/cli/python/agent_cli.py collect \
  --vitest vitest.json \
  --coverage coverage/coverage-summary.json

# 3. LLM-Review durchführen
python3 tools/agent-review/cli/python/agent_cli.py prompt
# → LLM mit build/prompt.txt → agent_output.json

# 4. Strukturierte Validierung
python3 tools/agent-review/cli/python/agent_cli.py validate \
  --output agent_output.json
```

Das Tool analysiert **alle Komponenten/Stores/Utils**, nicht nur einzelne Test-Dateien!

### DOM Mocking

```typescript
import { mockRect, mockCanvas } from './setup'

// Element Dimensionen mocken
mockRect(element, { width: 800, height: 600 })

// Canvas Context mocken
const ctx = mockCanvas()
```

### Vue Test Utils Helpers

```typescript
import { mount, shallowMount } from '@vue/test-utils'

// Vollständiges Rendering
const wrapper = mount(Component, {
  props: { title: 'Test' },
  global: {
    stubs: ['RouterLink']
  }
})

// Shallow Rendering (Performance)
const wrapper = shallowMount(Component)
```

### Async Testing

```typescript
import { nextTick } from 'vue'

it('should handle async updates', async () => {
  await wrapper.setProps({ data: newData })
  await nextTick()
  expect(wrapper.text()).toContain('Updated')
})
```

## 🐛 Bekannte Probleme & Lösungen

### 1. Monorepo Worker-Problem

**Problem**: `Cannot find module '/repo/dist/worker.js'`
**Lösung**: `singleThread: true` in `vitest.config.ts`

### 2. Store Integration Tests

**Problem**: Mock-Daten erreichen Komponenten nicht
**Häufige Ursachen**:
- Pinia nicht korrekt gemockt
- Store-Initialization fehlt
- Reactive State nicht korrekt simuliert

**Fix-Pattern**:
```typescript
import { createTestingPinia } from '@pinia/testing'

const wrapper = mount(Component, {
  global: {
    plugins: [createTestingPinia()]
  }
})
```

### 3. V-If Conditional Rendering

**Problem**: Button-State ändert sich nicht bei v-if
**Lösung**: `await nextTick()` nach State-Änderungen

## 📊 Test-Status

**Aktuelle Statistik**: 8/11 Tests bestanden (72.7%)

**Failing Tests**:
1. "should populate patient options" - Store mock data not reaching component
2. "should enable examination select when patient is selected" - Component state not updating
3. "should be enabled when both patient and examination are selected" - v-if conditional rendering

## 🎯 Best Practices

### 1. Test-Isolation

```typescript
describe('Component', () => {
  let wrapper: VueWrapper<any>
  
  beforeEach(() => {
    wrapper = mount(Component)
  })
  
  afterEach(() => {
    wrapper.unmount()
  })
})
```

### 2. Descriptive Test Names

```typescript
// ❌ Schlecht
it('works')

// ✅ Gut
it('should show loading state when fetching data')
```

### 3. Arrange-Act-Assert Pattern

```typescript
it('should update counter when button is clicked', async () => {
  // Arrange
  const wrapper = mount(Counter)
  
  // Act
  await wrapper.find('button').trigger('click')
  
  // Assert
  expect(wrapper.text()).toContain('Count: 1')
})
```

### 4. Mock External Dependencies

```typescript
vi.mock('@/api/client', () => ({
  fetchData: vi.fn(() => Promise.resolve(mockData))
}))
```

## 🚀 Erweiterte Features

### Code Coverage

```bash
npx vitest run --coverage
```

**Coverage-Ziele**:
- Statements: >80%
- Branches: >75%
- Functions: >85%
- Lines: >80%

### Visual Testing (Future)

```bash
# Playwright für E2E/Visual Tests
npm install @playwright/test
```

### Performance Testing

```typescript
import { performance } from 'perf_hooks'

it('should render within performance budget', () => {
  const start = performance.now()
  mount(HeavyComponent)
  const end = performance.now()
  
  expect(end - start).toBeLessThan(100) // 100ms budget
})
```

## 📚 Ressourcen

- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)
- [Pinia Testing](https://pinia.vuejs.org/cookbook/testing.html)

## 🤝 Contributing

1. **Neue Tests hinzufügen**: Folge der bestehenden Ordnerstruktur
2. **Test-Namen**: Beschreibend und spezifisch
3. **Setup-Code**: In `tests/setup.ts` für Wiederverwendbarkeit
4. **Coverage**: Neue Features benötigen Tests (>80% Coverage)

## 🔍 Debugging

### Vitest UI

```bash
npx vitest --ui
```

### Debug-Modus

```bash
npx vitest --inspect-brk
```

### Test-Logs

```typescript
console.log(wrapper.html()) // Component HTML ausgeben
console.log(wrapper.vm.$data) // Component Data inspizieren
```
