# LX-Annotate Frontend

Vue.js-basierte Frontend-Anwendung für medizinische Video-Annotation und Datenvalidierung.

## 🏗️ Architektur

LX-Annotate verwendet eine moderne **Django + Vue.js** Architektur:

- **Vue.js 3** mit TypeScript für die Frontend-SPA
- **Vite** für moderne Frontend-Tooling und Builds
- **django-vite** für nahtlose Django-Integration
- **Pinia** für State Management
- **Material Dashboard** Theme für UI-Komponenten

## 📁 Projektstruktur

```
lx-annotate/
├── frontend/                    # Vue.js Anwendung
│   ├── src/
│   │   ├── main.ts             # Vue App Entry Point
│   │   ├── App.vue             # Root Component
│   │   ├── components/         # Wiederverwendbare Komponenten
│   │   ├── views/              # Page-Level Komponenten
│   │   ├── stores/             # Pinia State Management
│   │   ├── api/                # API Service Layer
│   │   └── assets/             # CSS, Bilder, Fonts
│   ├── vite.config.ts          # Vite Konfiguration
│   └── package.json            # Node.js Dependencies
├── static/dist/                # Generierte Assets (nach npm run build)
│   ├── main.js                 # Kompilierte Vue App (~175KB)
│   ├── main.css               # Kompilierte Stylesheets
│   └── manifest.json          # Asset-Mapping für Django
└── lx_annotate/
    ├── templates/base.html     # Django Template mit Vue App
    └── settings/               # Django Konfiguration
```

## 🚀 Schnellstart

### Voraussetzungen

- **Node.js** (Version 18+)
- **Python** mit Django Backend
- **endoreg-db** Backend-Service

### Installation

1. **Frontend Dependencies installieren**
```bash
cd frontend
npm install
```

2. **Frontend Assets builden**
```bash
npm run build
```

3. **Django Backend starten**
```bash
# Aus dem Hauptverzeichnis
export DJANGO_SETTINGS_MODULE=lx_annotate.settings.settings_dev
python manage.py runserver
```

4. **Anwendung öffnen**
```
http://127.0.0.1:8000/
```

## 🛠️ Entwicklung

### Verfügbare Kommandos

```bash
# Dependencies installieren
npm install

# Entwicklungsserver (Hot-Reload)
npm run dev

# Production Build
npm run build

# TypeScript Type-Checking
npm run type-check

# Linting
npm run lint

# Unit Tests
npm run test:unit
```

### Development Workflow

#### Option 1: Production Mode (Empfohlen)
```bash
# 1. Frontend Assets builden
cd frontend
npm run build

# 2. Django im Development Mode
export DJANGO_SETTINGS_MODULE=lx_annotate.settings.settings_dev
python manage.py runserver

# 3. Nach Frontend-Änderungen: Neu builden
npm run build
```

#### Option 2: Hot-Reload Development (Erweitert)
```bash
# Terminal 1: Vite Dev Server
cd frontend
npm run dev

# Terminal 2: Django mit Dev-Mode
export DJANGO_SETTINGS_MODULE=lx_annotate.settings.settings_dev
# In settings/dev.py: DJANGO_VITE["default"]["dev_mode"] = True
python manage.py runserver
```

### TypeScript & Vue 3

- **Composition API** mit `<script setup>`
- **TypeScript** für Type Safety
- **Vue Router** für Client-Side Routing
- **Pinia Stores** für State Management

Beispiel Komponente:
```vue
<template>
  <div class="patient-form">
    <h2>{{ patient.name }}</h2>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Patient } from '@/api/patientService'

const patient = ref<Patient>({
  first_name: '',
  last_name: ''
})
</script>
```

## 🔗 Django Integration

### django-vite Setup

Die Integration erfolgt über **django-vite**:

**settings.py:**
```python
DJANGO_VITE = {
    "default": {
        "dev_mode": False,  # True für Hot-Reload
    }
}
```

**base.html Template:**
```html
{% load django_vite %}
<!DOCTYPE html>
<html>
<head>
    <meta name="csrf-token" content="{{ csrf_token }}">
    {% vite_asset 'src/main.ts' %}
</head>
<body>
    <div id="app"></div>
</body>
</html>
```

### API Integration

Frontend kommuniziert mit Django über REST APIs:

```typescript
// api/axiosInstance.ts
import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: '/api/',
  headers: {
    'X-CSRFToken': getCsrfToken(),
  }
})

// api/patientService.ts
export const patientService = {
  async getPatients(): Promise<Patient[]> {
    const response = await axiosInstance.get('patients/')
    return response.data
  }
}
```

## 🎯 Hauptfunktionen

### Video-Annotation
- **Video-Player** mit Timeline-Navigation
- **Label-Segmentierung** für medizinische Bereiche
- **Examination Forms** für strukturierte Datenerfassung
- **Real-Time API** Synchronisation

### Patient Management
- **CRUD Operations** für Patientendaten
- **Form Validation** mit TypeScript
- **Dropdown-Integration** mit Backend-Daten

### State Management (Pinia)
```typescript
// stores/videoStore.ts
export const useVideoStore = defineStore('videos', {
  state: () => ({
    videos: [],
    currentVideo: null
  }),
  actions: {
    async fetchVideos() {
      this.videos = await videoService.getVideos()
    }
  }
})
```

## 📦 Build-Prozess

### Vite Konfiguration

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    manifest: 'manifest.json',           // Asset-Mapping für Django
    outDir: '../static/dist',            // Output in Django static
    rollupOptions: {
      input: { main: 'src/main.ts' },
      output: {
        entryFileNames: '[name].js',     // main.js
        assetFileNames: '[name].[ext]',  // main.css
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',   // API-Proxy zu Django
    },
  },
})
```

### Generated Assets

Nach `npm run build`:
```
static/dist/
├── main.js          # Vue App Bundle (~175KB)
├── main.css         # Compiled Styles
├── manifest.json    # Asset-Mapping für django-vite
└── assets/          # Zusätzliche Assets
```

## 🔧 Troubleshooting

### Vue App lädt nicht
```bash
# Prüfen ob Assets existieren
ls static/dist/

# Build neu ausführen
cd frontend && npm run build

# Django-Vite Settings prüfen
# dev_mode = False in Produktion
```

### API-Calls schlagen fehl
```bash
# Django Server läuft?
curl http://127.0.0.1:8000/api/patients/

# CSRF-Token konfiguriert?
# Siehe base.html: <meta name="csrf-token" content="{{ csrf_token }}">
```

### Build-Fehler
```bash
# TypeScript-Fehler beheben
npm run type-check

# Dependencies aktualisieren
npm install

# Cache löschen
rm -rf node_modules/.vite
```

## 🚀 Deployment

### Production Checklist
- [ ] `npm run build` ausführen
- [ ] `dev_mode = False` in Django settings
- [ ] Static files konfiguriert (WhiteNoise/Nginx)
- [ ] CORS/CSRF für Production domain
- [ ] `ALLOWED_HOSTS` aktualisiert

### Environment Variables
```bash
# Development
export DJANGO_SETTINGS_MODULE=lx_annotate.settings.settings_dev

# Production
export DJANGO_SETTINGS_MODULE=lx_annotate.settings.prod
```

## 📚 Weitere Informationen

- **Vue 3 Dokumentation**: https://vuejs.org/
- **Vite Dokumentation**: https://vitejs.dev/
- **django-vite**: https://github.com/MrBin99/django-vite
- **Material Dashboard**: https://demos.creative-tim.com/material-dashboard/

## 🤝 Mitwirken

1. Fork das Repository
2. Erstelle einen Feature Branch
3. Implementiere Änderungen mit TypeScript
4. Teste mit `npm run build`
5. Erstelle Pull Request

---

**Hinweis**: Diese Anwendung ist für medizinische Datenvalidierung konzipiert und erfordert entsprechende Sicherheits- und Compliance-Maßnahmen.


