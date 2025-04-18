<template>
  <div>
    <slot v-if="isAuthenticated" name="authenticated-content"></slot>
    <slot v-else name="unauthenticated-content"></slot>
  </div>
</template>

<script>
import keycloak from '@/services/keycloak';

export default {
  name: 'AuthCheck',
  data() {
    return {
      isAuthenticated: false
    };
  },
  created() {
    this.isAuthenticated = keycloak.authenticated || false;
    
    // Event-Listener für Authentifizierungsänderungen
    keycloak.onAuthSuccess = () => {
      this.isAuthenticated = true;
    };
    
    keycloak.onAuthLogout = () => {
      this.isAuthenticated = false;
    };
    
    keycloak.onAuthRefreshSuccess = () => {
      this.isAuthenticated = true;
    };
    
    keycloak.onAuthRefreshError = () => {
      this.isAuthenticated = false;
    };
  }
};
</script>