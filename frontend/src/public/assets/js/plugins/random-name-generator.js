export default {
    data() {
      return {
        femaleNames: [],
        maleNames: [],
        neutralFirstNames: [],
        neutralLastNames: [],
        femaleFirstNames: [],
        femaleLastNames: [],
        maleFirstNames: [],
        maleLastNames: [],
      };
    },
    methods: {
      async loadNames() {
        // Helper function to load a name file and return an array of names
        const loadNameFile = async (filePath) => {
          const response = await fetch(filePath);
          const text = await response.text();
          return text.split('\n').map(name => name.trim()).filter(name => name.length > 0);
        };
  
        // Load all name files
        this.femaleNames = await loadNameFile('/names/first_and_last_names_female_ascii.txt');
        this.maleNames = await loadNameFile('/names/first_and_last_names_male_ascii.txt');
        this.neutralFirstNames = await loadNameFile('/names/first_names_neutral_ascii.txt');
        this.neutralLastNames = await loadNameFile('/names/last_names_neutral_ascii.txt');
        this.femaleFirstNames = await loadNameFile('/names/first_names_female_ascii.txt');
        this.femaleLastNames = await loadNameFile('/names/last_names_female_ascii.txt');
        this.maleFirstNames = await loadNameFile('/names/first_names_male_ascii.txt');
        this.maleLastNames = await loadNameFile('/names/last_names_male_ascii.txt');
      },
  
      getRandomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
      },
  
      generateRandomName(firstName, gender) {
        let firstNameSelected, lastNameSelected;
  
        switch (gender) {
          case 'male':
            firstNameSelected = this.getRandomElement(this.maleFirstNames);
            lastNameSelected = this.getRandomElement(this.maleLastNames);
            break;
          case 'female':
            firstNameSelected = this.getRandomElement(this.femaleFirstNames);
            lastNameSelected = this.getRandomElement(this.femaleLastNames);
            break;
          case 'neutral':
          default:
            firstNameSelected = this.getRandomElement(this.neutralFirstNames);
            lastNameSelected = this.getRandomElement(this.neutralLastNames);
            break;
        }
  
        return `${firstNameSelected} ${lastNameSelected}`;
      },
  
      determineGender(firstName) {
        // Simple gender determination logic (example)
        if (this.maleFirstNames.includes(firstName)) {
          return 'male';
        } else if (this.femaleFirstNames.includes(firstName)) {
          return 'female';
        } else {
          return 'neutral';
        }
      },
  
      handleAddRandomName() {
        const randomName = this.generateRandomName("", "neutral");
        console.log("Random Name:", randomName);
        // You can now use this random name in your application logic
      }
    },
    async created() {
      await this.loadNames();
    }
  };
  