## lx-annotate - API

LX-Annotate is a Vue-based Frontend living in a Django app. It utilizes an API to interact with the Endoreg-DB backend. This API is designed to facilitate the seamless integration of the annotation and review functionalities needed in day to day clinical work as well as for the basis of AI training.

## Production TODO List

- Switch out Base URL in .env - Setup is located in Tasks inside the devenv folder
- export DJANGO_SETTINGS=prod
- Set up NGINX and NGINX reverse proxy

## Features of the ecosystem - made available in a frontend

- **Video Annotation Interface**
- **Frame By Frame Annotation**
- **Case Generation**

## Functionality

When this project is started, a Django REST API is set up. For this, the backend in endoreg-db needs to be up and running. 

lx-annotate handles its setup mostly automatically using devenv.nix.

- Installation of django dependencies and npm dependencies
- Compilation of Vue-JS app using npm to static folder

## Installation

Lx-annotate is set up by a devenv.nix and uv2nix automatically. This file defines all inputs to the program, enables CUDA on the system and then sets up a python environment containing all the dependencies. To start the installation follow these steps:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/wg-lux/lx-annotate.git
   cd lx-annotate
   ```

2. **Adding packages**:
   First you need to add the packages to pyproject.toml,
   then uv will handle the installation through devenv.

   Disclaimer: you might need to set up direnv first.

   ```bash
   direnv allow
   ```

   Fallback:

   ```bash
   uv sync
   ```

3. **Using the Frontend**
  Requires compiling to the static folder of django.

  This is all the commands that need to be executed manually:

      ```bash
        direnv allow
        cd frontend
        direnv allow
        npm install
        npm run build
        cd ..
        ```

  Per default, our application is compiled to the Django static folder.
  ./lx-annotate/static

  You can change this, however it is not recommended.

  Ideally, running:

        ```bash
        direnv allow
        ```

  should handle the setup steps mentioned above automatically.

## API Setup

The API is set up to relay requests to the backend module endoreg_db_api. Django acts like a proxy API.

All requests to {base_url}/api/{route} get rerouted to the backend. In testing, this is set up to be rerouted to http://127.0.0.1:8000/endoreg_db/api/

In production the URL should be automatically updated by the django app. You need to export the django production settings for this to work.

## Implementing new components

1. Create the Component inside of frontend/src/components
2. Register it in the vue router at:

./lx-annotate/frontend/src/router/index.ts

3. Use it in a view or define a new one at:

./lx-annotate/frontend/src/views

4. Dashboard will show new views automatically, the sidebar however needs to be provided with the link. This can be done in:

./lx-annotate/frontend/src/components/SidebarComponent.vue

## Error Handling

If the API encounters any error during processing, it will return a response with the error message and the stack trace for debugging purposes.

```json
{
  "error": "Description of the error",
  "traceback": "Detailed traceback for debugging"
}
```

Other useful information can come from the network tab in your browser.

## File handling

Video or image files are per default uploaded via the api. I case a local video is to be uploaded and segments are to be added, the file upload is handled by FilePond.

Here, a locally stored video can be edited.
This is especially useful in testing.



## Usage of lx-anonymizer !!CURRENTLY DISABLED!!

To use the lx-anonymizer API, follow these steps:

1. **Prepare Your Images**:
   Place the images you want to process in a designated folder.

2. **Configure Settings**:
   Adjust settings in the settings.py file

2.5. **Setup Frontend**

    ```bash
        direnv allow
        cd frontend
        direnv allow
        npm install
        npm run build
        cd ..
    ```

3. **Run the Django Server**:

   ```bash
   python manage.py runserver
   ```

4. **Make API Requests**:
   Use an API client like Postman, cURL, or the `requests` library in Python to interact with the lxAnonymizer API. Example request using the `requests` library:

   ```python
   import requests
   import os

   # Get the directory of the current script
   base_dir = os.path.dirname(os.path.abspath(__file__))

   # Define the path to the image file located in the 'requests_agl_anonymizer' folder
   image_path = os.path.join(base_dir, 'frame_0.jpg')

   # Ensure the file exists
   if not os.path.exists(image_path):
       raise FileNotFoundError(f"No such file or directory: '{image_path}'")

   # Define the URL of the Django API endpoint
   url = 'http://127.0.0.1:8000/process/'

   # Open the file in binary mode and send it as part of the multipart form-data payload
   with open(image_path, 'rb') as image_file:
       files = {
           'file': image_file,
       }
       data = {
           'title': 'Example Image',
       }
       response = requests.post(url, files=files, data=data)

   # Print the response from the server
   print(response.status_code)
   print(response.json())  # Assuming the server returns a JSON response
   ```

# API Endpoint: Process File

This API endpoint allows users to upload a file (image) for anonymization and further processing. The file can be processed in two modes:

Validation Mode: When enabled, the processed data will be sent to the Endoreg Client Manager for validation and saving.
Non-validation Mode: The processed file and the original image are saved, and their URLs are returned in the response.

## URL

POST /process-file/

## Parameters

1. file: The image file to be processed (required).
2. device: The device name (optional). Default is olympus_cv_1500.
3. validation: A flag to indicate if the validation mode is enabled (optional). Can be true or false. Default is false.

## Request Example (Non-validation Mode)

```bash
curl -X POST http://<your-server>/process-file/ \
    -F "file=@/path/to/your/image.jpg" \
    -F "device=olympus_cv_1500" \
    -F "validation=false"
```

## Request Example (Validation Mode)

```bash
curl -X POST http://<your-server>/process-file/ \
    -F "file=@/path/to/your/image.jpg" \
    -F "device=olympus_cv_1500" \
    -F "validation=true"
Response (Non-validation Mode)
```

If the validation mode is disabled, the API will return URLs for both the processed file and the original image.

```json
{
  "status": "success",
  "message": "Processing completed",
  "processed_file_url": "<url-to-processed-file>",
  "original_image_url": "<url-to-original-image>",
  "gender_pars": {
    "male": 0.6,
    "female": 0.4
  }
}
```

## Response (Validation Mode)

If validation mode is enabled, the processed data will be sent to the Endoreg Client Manager to be displayed later once the user logs into the AGL Validator. The API will return the following response:

**-> For this to work, the correct url must be defined inside of settings.py **

```json
{
  "status": "success",
  "message": "Processing completed and data sent to endoreg client manager",
  "api_response": {
    "status": "ok",
    "message": "Data saved successfully"
  }
}
```


### UploadedFile

Represents an uploaded file with fields for the original file, upload date, and an optional description.

```python
from django.db import models
from django.utils import timezone

class UploadedFile(models.Model):
    original_file = models.FileField(upload_to='uploads/original/')
    upload_date = models.DateTimeField(default=timezone.now)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.original_file.name

```

### Intro for Python Devs

### Intro
**Teaching Vue and TypeScript based on repository**

The user is looking for a quick, practical crash course tailored to the repository they've shared. They already have a strong background in Python, HTML, and experience with Pinia and Django, so I should tailor the lesson to their knowledge, focusing on how Vue 3 and TypeScript are used in that particular codebase. I’ll open the repository, check the code patterns, and gather high-quality documentation and examples to make this a quick yet solid learning experience. I'll reference at least 10 sources for accuracy.


**Planning Vue and TypeScript Tutorial**

To teach Vue and TypeScript based on the repository, we'll focus on key patterns: using the Composition API with script setup, .vue component structure, and Pinia for state management. I’ll emphasize how to define stores with `defineStore`, passing state and actions. Axios will be covered for API calls, and we'll also touch on TypeScript for defining interfaces like those for API responses. Although some searching didn’t yield results, we know enough from earlier to proceed with these concepts and provide examples to the user.


**Gathering resources for Vue and TypeScript tutorial**

I’ll gather at least 10 high-quality sources, using official documentation: Vue, Pinia, TypeScript, Axios, and MDN for additional fetch details. These will give me the most accurate and reliable information. I’ll look into specific Vue and Pinia docs for using TypeScript, focusing on Vue’s Composition API, script setup, and Pinia with TypeScript. I'll also check for Axios integration with TypeScript and consider exploring additional TypeScript resources for a thorough understanding. This will ensure that the user will get comprehensive, solid information for the tutorial.


**Crafting quick and dirty tutorial**

For the "quick and dirty" Vue + TypeScript tutorial, I’ll cover the foundational concepts like Single File Components (SFC), script setup, reactivity, and useful Vue features like `defineProps`, `emit`, and `provide/inject`. I’ll also include Pinia store usage with Axios integration to match patterns in the code snippet from the repository. To help Python developers, I'll highlight key parallels between Vue + TypeScript and Python concepts. Citations are ready, drawing from official docs and previous code insight for proper reference.


Thought for 47 seconds


Below is a “90-minute crash course” that reverse-engineers the patterns you already have in **lx-annotate** and links them to the official Vue 3 / TypeScript / Pinia idioms.  If you can read Python, HTML and Django views, you already know 80 % of the concepts—this guide just hands you the JS / TS syntax.

---

## 1 Mental model

* **Vue 3** is the template + reactivity layer—think of it as Django templates that re-render automatically when the “context” (state) changes.
* **Composition API** (with **`<script setup>`**) lets you declare that state as plain variables and functions instead of the old Options API’s dictionaries.  It feels very close to Python modules. ([Vue.js][1])
* **TypeScript** adds static types, catches typos and documents payload shapes; Vue ships its own type definitions so you get autocomplete out-of-the-box. ([Vue.js][2])
* **Pinia** is basically *Django models for the browser*—a global, reactive datastore with computed properties (getters) and transaction-like methods (actions). ([pinia.vuejs.org][3])

The rest is just file layout and syntax.

---

## 2 Project anatomy in `lx_annotate`

```
src/
  components/        # *.vue single-file components
  stores/            # Pinia stores (e.g. videoStore.ts)
  api/               # axios wrappers (axiosInstance.ts, videoAxiosInstance.ts)
  router/            # vue-router config (if you add it later)
  main.ts            # createApp(), createPinia(), mount('#app')
```

A Single File Component (SFC) contains three blocks:

```vue
<template>             <!-- HTML-ish markup with Vue directives -->
  <div>{{ video.fileName }}</div>
</template>

<script setup lang="ts"> <!-- Composition API + TS -->
import { ref } from 'vue'
const props = defineProps<{ id: number }>()
const fileName = ref('')
</script>

<style scoped>/* optional css */</style>
```

`lang="ts"` is all you need to turn on TypeScript in that file. ([Vue.js][4])

---

## 3 The Composition API in 10 lines

```ts
<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// 1. local reactive state
const count = ref(0)

// 2. derived state
const doubled = computed(() => count.value * 2)

// 3. side effects
watch(count, (n) => console.log('changed to', n))

// 4. expose to template – everything is automatically public
function inc() { count.value++ }
</script>
```

*`ref` ⇒ scalar, `reactive` ⇒ object/array; `computed` ≈ Django `@cached_property`.* ([Vue.js][5])

---

## 4 Pinia “setup” stores ⇢ match your `videoStore.js`

### 4.1 Skeleton

```ts
// stores/video.ts
import { defineStore } from 'pinia'
import axios from '@/api/axiosInstance'   // alias via Vite tsconfig

export const useVideoStore = defineStore('video', () => {
  /** -------------------- state -------------------- **/
  const current = ref<Video | null>(null)
  const list    = ref<VideoMeta[]>([])

  /** ------------------- getters ------------------- **/
  const hasVideo   = computed(() => !!current.value)
  const duration   = computed(() => current.value?.duration ?? 0)

  /** ------------------- actions ------------------- **/
  async function fetchAll() {
    const { data } = await axios.get<VideoMeta[]>('videos/')
    list.value = data
  }
  async function load(id: number) {
    current.value = await axios.get<Video>(`video/${id}/`).then(r => r.data)
  }

  return { current, list, hasVideo, duration, fetchAll, load }
})
```

* `defineStore()` must get a unique-across-app name (`'video'` above). ([pinia.vuejs.org][6])
* `ref<T>()` tells TS the inner type; the template reads `current.videoUrl`, not `current.value.videoUrl`.
* Getters are just `computed`s; Pinia merges them under the hood. ([pinia.vuejs.org][7])
* Actions can be async; Pinia auto-wraps them so component code is simply `await videoStore.fetchAll()`. ([pinia.vuejs.org][8])

### 4.2 Using the store in a component

```vue
<script setup lang="ts">
import { useVideoStore } from '@/stores/video'
const video = useVideoStore()

onMounted(video.fetchAll)        // lifecycle hook
</script>

<template>
  <div v-if="video.hasVideo">
    {{ video.current?.videoUrl }}
  </div>
</template>
```

The store is singleton—every component refers to the same reactive instance (like importing a Python module).

---

## 5 Type-safe API calls with Axios

```ts
// api/axiosInstance.ts
import axios from 'axios'

export default axios.create({
  baseURL: '/api/',               // matches Django include("")
  headers:  { 'Accept': 'application/json' },
})
```

```ts
interface VideoMeta {
  id: number
  originalFileName: string
  status: 'available' | 'in_progress' | 'completed'
  anonymized: boolean
}

const { data } = await axios.get<VideoMeta[]>('videos/')  // TS infers array shape
```

Axios’ generic argument fills `response.data` with strongly-typed objects—no need to cast.  (Vue / TS docs show the same pattern.) ([Vue Test Utils][9])

---

## 6 SFC patterns you’ll see in the repo

| Pattern in repo                                         | Vue / TS concept                           | Docs                     |
| ------------------------------------------------------- | ------------------------------------------ | ------------------------ |
| `computed(() => ...)` in store                          | Pinia getter                               | ([pinia.vuejs.org][10])  |
| `const videoUrl = ref('')`                              | local reactive state                       | ([Vue.js][5])            |
| `async function fetchSegmentsByLabel(id, label)`        | Pinia action                               | ([pinia.vuejs.org][8])   |
| `defineStore('video', () => { ... })`                   | setup-style store                          | ([pinia.vuejs.org][6])   |
| `export interface VideoResponse { ... }`                | TS interface for API JSON                  | ([Vue.js][2])            |
| `<template>` loop with `v-for="segment in allSegments"` | directive equivalent to Django `{% for %}` | ([Vue.js][11])           |
| `<style scoped>`                                        | CSS isolation per component                | (SFC spec) ([Vue.js][1]) |

---

## 7 Cheat-sheet for a Python-minded developer

| You know in Django       | In Vue / TS                        | One-liner              |
| ------------------------ | ---------------------------------- | ---------------------- |
| `models.py` + `QuerySet` | Pinia store state + getters        | reactive DB            |
| template tags            | mustache `{{ }}` / directives      | auto-updates           |
| CBV `get()`              | Pinia action hitting REST          | async/await            |
| `@cached_property`       | `computed()`                       | memoised derived state |
| `urlpatterns`            | Vite dev-server proxy / vue-router | optional               |

---

## 8 Common pitfalls (and how to avoid them)

1. **Forget `.value`** – only needed inside TS/JS, never in templates.
2. **Mutable props** – always `const prop = toRef(props, 'xxx')` or use `defineProps<{…}>()` when you need to mutate. ([Vue.js][4])
3. **Big reactive objects in Pinia** – mutate deeply and Vue will still track; don’t reassign the whole object or you’ll lose reactivity (similar to Django queryset vs list copy). ([pinia.vuejs.org][8])
4. **Mixing Option API and Composition API** – possible but confusing; stick to `<script setup>` everywhere for consistency. ([Vue.js][12])
5. **Storing route params in store** – use vue-router’s `useRoute()` instead, or you’ll create hard-to-debug duplicates.  (Pinia best-practices.) ([Pinia Mastery][13])

---

## 9 Where to deepen next

* Official **Vue 3 guide / TypeScript** section – concise and project-ready examples. ([Vue.js][2])
* **Pinia documentation** – read “Core concepts” start-to-finish; it takes less than an hour. ([pinia.vuejs.org][10])
* **Mastering Pinia** blog for antipatterns. ([Pinia Mastery][13])
* **VueUse** (community library) for ready-made composables—saves boilerplate when you start writing more Composition-API logic. (Search when needed.)
* Vite’s hot-module-replacement works out-of-the-box; keep one terminal running `npm run dev`.

---

### TL;DR 

```bash
# create a component
touch src/components/Greeting.vue
# create a store
touch src/stores/greeting.ts
```

**Greeting.vue**

```vue
<template><h1>{{ message }}</h1></template>
<script setup lang="ts">
import { useGreetingStore } from '@/stores/greeting'
const s = useGreetingStore(); s.load()
</script>
```

**greeting.ts**

```ts
export const useGreetingStore = defineStore('greeting', () => {
  const message = ref(''); async function load() {
    message.value = await fetch('/api/hello').then(r => r.text())
  }
  return { message, load }
})
```

That’s the entire flow—compose state ➜ expose to template ➜ react to API or user events.  Everything else (router, testing, build) can be layered on when you need it.

Enjoy hacking on **lx-annotate**—you already have the Python mindset; Vue + TypeScript is just Pythonic data-binding with different brackets.

[1]: https://vuejs.org/api/sfc-script-setup?utm_source=chatgpt.com "<script setup> | Vue.js"
[2]: https://vuejs.org/guide/typescript/overview?utm_source=chatgpt.com "Using Vue with TypeScript - Vue.js"
[3]: https://pinia.vuejs.org/introduction.html?utm_source=chatgpt.com "Introduction | Pinia - Vue.js"
[4]: https://vuejs.org/guide/typescript/composition-api?utm_source=chatgpt.com "TypeScript with Composition API - Vue.js"
[5]: https://vuejs.org/api/composition-api-setup.html?utm_source=chatgpt.com "Composition API: setup() - Vue.js"
[6]: https://pinia.vuejs.org/core-concepts/?utm_source=chatgpt.com "Defining a Store - Pinia"
[7]: https://pinia.vuejs.org/core-concepts/getters.html?utm_source=chatgpt.com "Getters | Pinia"
[8]: https://pinia.vuejs.org/core-concepts/actions.html?utm_source=chatgpt.com "Actions | Pinia - Vue.js"
[9]: https://v1.test-utils.vuejs.org/guides/using-with-typescript.html?utm_source=chatgpt.com "Using with TypeScript - Vue Test Utils"
[10]: https://pinia.vuejs.org/core-concepts/state.html?utm_source=chatgpt.com "State | Pinia"
[11]: https://vuejs.org/guide/quick-start?utm_source=chatgpt.com "Quick Start - Vue.js"
[12]: https://vuejs.org/guide/extras/composition-api-faq?utm_source=chatgpt.com "Composition API FAQ - Vue.js"
[13]: https://masteringpinia.com/blog/top-5-mistakes-to-avoid-when-using-pinia?utm_source=chatgpt.com "Top 5 mistakes to avoid when using Pinia"

