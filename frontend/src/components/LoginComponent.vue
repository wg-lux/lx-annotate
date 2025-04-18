<template>
    <div class="container my-5">
      <div class="row">
        <div class="col-lg-6 col-md-8 col-12 mx-auto">
          <div class="card z-index-0 fadeIn3 fadeInBottom">
            <div class="card-header p-0 position-relative z-index-2">
              <div class="bg-primary shadow-primary border-radius-lg py-3">
                <h4 class="text-white font-weight-bolder text-center mt-2 ">Anmeldung</h4>
                <div class="row">
                </div>
              </div>
            </div>
            <div class="card-body">
              <div class="text-center">
                <button type="button" class="btn bg-primary w-100 my-4 mb-2 text-white" @click="handleLogin">Mit Keycloak anmelden</button>
              </div>
              <div v-if="error" class="alert alert-danger text-white" role="alert">
                {{ error }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
  </template>
  
  <script>
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import keycloak from '@/services/keycloak';
  
  export default {
    name: 'LoginComponent',
    setup() {
      const router = useRouter();
      const error = ref(null);
  
      const handleLogin = async () => {
        try {
          error.value = null;
          keycloak.login();
        } catch (err) {
          error.value = 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.';
          console.error('Login error:', err);
        }
      };
  
      return {
        error,
        handleLogin,
      };
    },
  };
  </script>
  
  <style scoped>

  
  .fadeIn3 {
    animation: fadeIn 0.3s ease-in;
  }
  
  .fadeInBottom {
    animation: fadeInBottom 0.3s ease-in;
  }
  
  @keyframes fadeIn {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
  
  @keyframes fadeInBottom {
    0% {
      transform: translateY(20px);
      opacity: 0;
    }
    100% {
      transform: translateY(0);
      opacity: 1;
    }
  }
  </style>
