<template>
    <div id="background-image" class="card mb-4" @drop="handleDrop" @dragover.prevent>
      <!-- Background Image -->
      <img v-if="backgroundUrl" :src="backgroundUrl" class="img-fluid" alt="Background">
  
      <!-- Dropped Images -->
      <img v-for="(droppedName, index) in droppedNames" 
           :key="index"
           :src="droppedName.imageUrl" 
           :style="{ top: droppedName.y + 'px', left: droppedName.x + 'px', position: 'absolute' }" 
           class="dropped-name" 
           :alt="droppedName.label">
    </div>
</template>
  
<script setup>
  import { ref, onMounted } from 'vue';
  import axios from 'axios';
  
  // Reactive state
  const backgroundUrl = ref('');
  const droppedNames = ref([]);
  
  // Fetch data from API on component mount
  onMounted(async () => {
    try {
      // Fetch background image URL
      const backgroundResponse = await axios.get('http://127.0.0.1:8000/api/background-image/');
      backgroundUrl.value = backgroundResponse.data.imageUrl;
  
      // Fetch dropped names data (assuming this includes image URLs and positions)
      const droppedNamesResponse = await axios.get('http://127.0.0.1:8000/api/dropped-names/');
      droppedNames.value = droppedNamesResponse.data.names;
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  });
  
  // Handle the drop event
  const handleDrop = async (event) => {
    event.preventDefault();
  
    const nameLabel = event.dataTransfer?.getData('nameLabel');
    const imageUrl = event.dataTransfer?.getData('imageUrl'); // Assuming you transfer image URL as well
  
    if (nameLabel && imageUrl) {
      const newDroppedName = {
        label: nameLabel,
        imageUrl: imageUrl,
        x: event.offsetX,
        y: event.offsetY
      };
      
      droppedNames.value.push(newDroppedName);
  
        try {
        const response = await axios.post('http://127.0.0.1:8000/api/dropped-names/', newDroppedName);
        console.log('Dropped name saved:', response.data);
      } catch (error) {
        console.error('Error saving dropped name:', error);
      }
    }
  }; 
</script>
  
  <style scoped>
  /* Add global styles here */
  #background-image {
    position: relative;
    width: 100%;
    height: 500px; /* Adjust height as necessary */
    overflow: hidden;
    border: 1px solid #ccc;
    background-color: #f8f9fa;
  }
  
  .dropped-name {
    width: 50px; /* Adjust size as necessary */
    height: 50px;
    object-fit: cover;
    position: absolute; /* This makes it draggable */
  }
</style>
  