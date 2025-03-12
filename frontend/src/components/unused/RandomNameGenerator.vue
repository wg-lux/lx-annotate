<template>
  <div>
    <!-- Gender selection using radio buttons -->
    <label>Select Gender:</label>
    <div>
      <label>
        <input type="radio" value="male" v-model="selectedGender" />
        Male
      </label>
      <label>
        <input type="radio" value="female" v-model="selectedGender" />
        Female
      </label>
    </div>

    <!-- Button to add random name -->
    <button class="btn btn-success" @click="handleAddRandomName">Add Random Name</button>

    <!-- Error message display -->
    <p v-if="errorMessage" style="color: red;">{{ errorMessage }}</p>

    <!-- List of added names with delete buttons -->
    <ul class="name-list">
      <keep-alive>
        <li v-for="(name, index) in randomNames" :key="index" class="name-item">
          <span class="highlighted-name">{{ name }}</span>
          <button class="btn btn-danger btn-sm" @click="removeName(index)">Delete</button>
        </li>
      </keep-alive>
    </ul>
  </div>
</template>

<script>
export default {
  data() {
    return {
      randomNames: [], // Array to store multiple random names
      selectedGender: "", // Default gender selection (empty string)
      femaleFirstNames: [],
      femaleLastNames: [],
      maleFirstNames: [],
      maleLastNames: [],
      errorMessage: "" // Variable to store error messages
    };
  },
  methods: {
    async loadNames() {
      const loadNameFile = async (filePath) => {
      const response = await fetch(filePath);
      const text = await response.text();
      // Ersetzen von \r\n durch \n und dann Splitten
      return text.replace(/\r\n/g, '\n').split('\n').map(name => name.trim()).filter(name => name.length > 0);
    };


      // Load female and male names
      this.femaleFirstNames = await loadNameFile('./assets/names-dictionary/first_names_female_ascii.txt');
      this.femaleLastNames = await loadNameFile('./assets/names-dictionary/last_names_female_ascii.txt');
      this.maleFirstNames = await loadNameFile('./assets/names-dictionary/first_names_male_ascii.txt');
      this.maleLastNames = await loadNameFile('./assets/names-dictionary/last_names_male_ascii.txt');

      // Validation: Ensure first names and last names arrays have equal lengths
      if (this.femaleFirstNames.length !== this.femaleLastNames.length) {
        this.errorMessage = "Female first names and last names are not of the same length.";
        return;
      }
      if (this.maleFirstNames.length !== this.maleLastNames.length) {
        this.errorMessage = "Male first names and last names are not of the same length.";
        return;
      }

      // Clear any previous error message after successful load
      this.errorMessage = "";
    },
    getRandomIndex(array) {
      // Return a random index from the array
      return Math.floor(Math.random() * array.length);
    },
    generateRandomName(gender) {
      if (!this.selectedGender) {
        this.errorMessage = 'Please specify the gender before adding a random name.';
        return;
      }

      let firstNameArray, lastNameArray;

      switch (gender) {
        case 'male':
          firstNameArray = this.maleFirstNames;
          lastNameArray = this.maleLastNames;
          break;
        case 'female':
          firstNameArray = this.femaleFirstNames;
          lastNameArray = this.femaleLastNames;
          break;
        default:
          this.errorMessage = 'Invalid gender selected.';
          return;
      }

      // Clear the error message if everything is fine
      this.errorMessage = "";

      // Ensure arrays are not empty and have the same length (validated earlier)
      const randomIndex = this.getRandomIndex(firstNameArray);

      // Return the first name and last name at the same index
      const firstNameSelected = firstNameArray[randomIndex];
      const lastNameSelected = lastNameArray[randomIndex];

      return `${firstNameSelected} ${lastNameSelected}`;
    },
    handleAddRandomName() {
      const randomName = this.generateRandomName(this.selectedGender); // Pass the selected gender
      if (randomName) {
        this.randomNames.push(randomName); // Add to the array of random names if valid
      }
    },
    removeName(index) {
      this.randomNames.splice(index, 1); // Remove the name at the given index
    }
  },
  async created() {
    await this.loadNames(); // Load names when the component is created
  }
};
</script>

<style scoped>
.name-list {
  list-style-type: none;
  padding-left: 0;
}

.name-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  margin-bottom: 8px;
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 5px;
  transition: background-color 0.3s ease;
}

.name-item:hover {
  background-color: #e0f7fa; /* Light blue hover effect */
}

.highlighted-name {
  font-weight: bold;
  color: #007bff; /* Bootstrap primary color */
}

.btn-sm {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}
</style>
