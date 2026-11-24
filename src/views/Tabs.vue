<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/tabs/home">
          <ion-icon :icon="is('home') ? home : homeOutline" /><ion-label>Start</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="progress" href="/tabs/progress">
          <ion-icon :icon="is('progress') ? statsChart : statsChartOutline" /><ion-label>Postępy</ion-label>
        </ion-tab-button>
        <!-- middle: all trainings (start one, edit the plan) -->
        <ion-tab-button tab="train" href="/tabs/train" class="center">
          <span class="c-ico"><ion-icon :icon="barbell" /></span><ion-label>Trening</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="history" href="/tabs/history">
          <ion-icon :icon="is('history') ? calendar : calendarOutline" /><ion-label>Historia</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="profile" href="/tabs/profile">
          <ion-icon :icon="is('profile') ? personCircle : personCircleOutline" /><ion-label>Profil</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>
<script setup>
import { IonPage, IonTabs, IonRouterOutlet, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/vue'
import { barbell, home, homeOutline, statsChart, statsChartOutline, calendar, calendarOutline, personCircle, personCircleOutline } from 'ionicons/icons'
import { useRoute } from 'vue-router'
const route = useRoute()
const is = t => route.path.includes('/' + t)
</script>
<style scoped>
.center .c-ico { width: 46px; height: 32px; border-radius: 12px; display: grid; place-items: center; background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); }
.center .c-ico ion-icon { font-size: 24px; color: inherit; }
.center.tab-selected .c-ico { background: var(--accent); color: #fff; }
</style>
