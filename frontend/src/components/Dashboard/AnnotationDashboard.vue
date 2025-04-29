<template>
  <div class="container-fluid py-4">
    <div class="row">
      <!-- Video Annotations Overview -->
      <div class="col-md-4">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Video-Annotationen</h5>
          </div>
          <div class="card-body">
            <p><strong>Gesamtanzahl:</strong> {{ videoStats.total }}</p>
            <p><strong>In Bearbeitung:</strong> {{ videoStats.inProgress }}</p>
            <p><strong>Abgeschlossen:</strong> {{ videoStats.completed }}</p>
            <p><strong>Verfügbar:</strong> {{ videoStats.available }}</p>
          </div>
        </div>
      </div>

      <!-- Image Annotations Overview -->
      <div class="col-md-4">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Bild-Annotationen</h5>
          </div>
          <div class="card-body">
            <p><strong>Gesamtanzahl:</strong> {{ imageStats.total }}</p>
            <p><strong>In Bearbeitung:</strong> {{ imageStats.inProgress }}</p>
            <p><strong>Abgeschlossen:</strong> {{ imageStats.completed }}</p>
          </div>
        </div>
      </div>

      <!-- Anonymization Annotations Overview -->
      <div class="col-md-4">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Anonymisierungs-Annotationen</h5>
          </div>
          <div class="card-body">
            <p><strong>Gesamtanzahl:</strong> {{ anonymizationStats.total }}</p>
            <p><strong>In Bearbeitung:</strong> {{ anonymizationStats.inProgress }}</p>
            <p><strong>Abgeschlossen:</strong> {{ anonymizationStats.completed }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- User-Based Overview -->
    <div class="row mt-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Benutzerbasierte Übersicht</h5>
          </div>
          <div class="card-body">
            <table class="table table-bordered">
              <thead>
                <tr>
                  <th>Benutzer</th>
                  <th>Video-Annotationen</th>
                  <th>Bild-Annotationen</th>
                  <th>Anonymisierungs-Annotationen</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in users" :key="user.id">
                  <td>{{ user.name }}</td>
                  <td>{{ user.videoAnnotations }}</td>
                  <td>{{ user.imageAnnotations }}</td>
                  <td>{{ user.anonymizationAnnotations }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useVideoStore } from '@/stores/videoStore';
import { useImageStore } from '@/stores/imageStore';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
import { useUserStore } from '@/stores/userStore';

const videoStore = useVideoStore();
const imageStore = useImageStore();
const anonymizationStore = useAnonymizationStore();
const userStore = useUserStore();

const videoStats = ref({
  total: 0,
  inProgress: 0,
  completed: 0,
  available: 0,
});

const imageStats = ref({
  total: 0,
  inProgress: 0,
  completed: 0,
});

const anonymizationStats = ref({
  total: 0,
  inProgress: 0,
  completed: 0,
});

const users = ref([]);

onMounted(async () => {
  // Fetch video annotations
  await videoStore.fetchAllVideos();
  const videos = videoStore.videoList.videos;
  videoStats.value.total = videos.length;
  videoStats.value.inProgress = videos.filter(v => v.status === 'in_progress').length;
  videoStats.value.completed = videos.filter(v => v.status === 'completed').length;
  videoStats.value.available = videos.filter(v => v.status === 'available').length;

  // Fetch image annotations
  imageStats.value.total = imageStore.data.length;
  imageStats.value.inProgress = imageStore.data.filter(img => img.status === 'in_progress').length;
  imageStats.value.completed = imageStore.data.filter(img => img.status === 'completed').length;

  // Fetch anonymization annotations
  await anonymizationStore.fetchPendingAnonymizations();
  const anonymizations = anonymizationStore.pendingAnonymizations;
  anonymizationStats.value.total = anonymizations.length;
  anonymizationStats.value.inProgress = anonymizations.filter(a => a.status === 'in_progress').length;
  anonymizationStats.value.completed = anonymizations.filter(a => a.status === 'completed').length;

  // Fetch users and their annotation counts
  await userStore.fetchUsers();
  users.value = userStore.users.map(user => ({
    id: user.id,
    name: user.name,
    videoAnnotations: videos.filter(v => v.assignedUser === user.name).length,
    imageAnnotations: imageStore.data.filter(img => img.assignedUser === user.name).length,
    anonymizationAnnotations: anonymizations.filter(a => a.report_meta.patient_first_name === user.name).length,
  }));
});
</script>

<style scoped>
.card {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.table {
  margin-bottom: 0;
}

.table th, .table td {
  text-align: center;
  vertical-align: middle;
}
</style>
