<template>
  <ion-app><ion-router-outlet /><AppDialog /></ion-app>
</template>
<script setup>
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import AppDialog from './views/AppDialog.vue'
</script>
