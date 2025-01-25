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
              <form role="form" class="text-start">
                <div class="input-group input-group-outline my-3">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-control" v-model="email">
                </div>
                <div class="input-group input-group-outline mb-3">
                  <label class="form-label">Passwort</label>
                  <input type="password" class="form-control" v-model="password">
                </div>

                <div class="text-center">
                  <button type="button" class="btn bg-primary w-100 my-4 mb-2 text-white" @click="handleLogin">Einloggen</button>
                </div>
                <div v-if="error" class="alert alert-danger text-white" role="alert">
                  {{ error }}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
    
  </template>
  
  <script>
  import { ref } from 'vue';
  import { useAuthStore } from '@/stores/auth';
  import { useRouter } from 'vue-router';
  
  export default {
    name: 'LoginComponent',
    setup() {
      const authStore = useAuthStore();
      const router = useRouter();
  
      const email = ref('');
      const password = ref('');
      const rememberMe = ref(false);
      const error = ref(null);
  
      const handleLogin = async () => {
        try {
          error.value = null;
          await authStore.login({ email: email.value, password: password.value });
          router.push('/');
        } catch (err) {
          error.value = 'Failed to login. Please check your credentials.';
        }
      };
  
      return {
        email,
        password,
        rememberMe,
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
  