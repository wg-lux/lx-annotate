<template>
    <div>
      <form @submit.prevent="handleSubmit">
        <input v-model="formData.name" id="name" placeholder="Enter name" />
        <input v-model="formData.polypCount" id="polypCount" type="number" placeholder="Anzahl der Polypen" />
        <textarea v-model="formData.comments" id="comments" placeholder="Comments"></textarea>
  
        <label>
          Geschlecht:
          <input type="radio" id="genderFemale" name="gender" value="female" v-model="formData.gender" /> Weiblich
          <input type="radio" id="genderMale" name="gender" value="male" v-model="formData.gender" /> Männlich
          <input type="radio" id="genderDivers" name="gender" value="divers" v-model="formData.gender" /> Divers
        </label>
  
        <button type="submit" id="saveData">Speichern</button>
        <div v-if="errorMessage" class="alert alert-danger mt-2">{{ errorMessage }}</div>
      </form>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        formData: {
          name: '',
          polypCount: '',
          comments: '',
          gender: '',
          droppedNames: []  // Assuming this is set elsewhere in the app
        },
        errorMessage: ''
      };
    },
    methods: {
      getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
          const cookies = document.cookie.split(';');
          for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
              cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
              break;
            }
          }
        }
        return cookieValue;
      },
      async handleSubmit() {
        // Validate the form
        if (!this.formData.name.trim()) {
          this.errorMessage = 'Name cannot be empty. Please enter a name.';
          return;
        }
        this.errorMessage = '';
  
        // Collect draggable names with their coordinates (assuming it's set in data)
        const droppedNames = this.$emit('get-dropped-names');
  
        const data = {
          ...this.formData,
          droppedNames
        };
  
        try {
          const response = await fetch('http://127.0.0.1:8000/save-annotated-data/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': this.getCookie('csrftoken')
            },
            body: JSON.stringify(data)
          });
  
          const result = await response.json();
          if (result.status === 'success') {
            alert('Data saved successfully!');
          } else {
            alert('Failed to save data.');
          }
        } catch (error) {
          console.error('Error:', error);
        }
      }
    }
  };
  </script>
  
  <style scoped>
  /* Add any specific styling here */
  </style>
  