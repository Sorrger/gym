<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/tabs/home">
          <ion-icon :icon="is('home') ? barbell : barbellOutline" /><ion-label>Start</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="progress" href="/tabs/progress">
          <ion-icon :icon="is('progress') ? statsChart : statsChartOutline" /><ion-label>Postępy</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="weight" href="/tabs/weight">
          <ion-icon :icon="is('weight') ? scale : scaleOutline" /><ion-label>Waga</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="history" href="/tabs/history">
          <ion-icon :icon="is('history') ? calendar : calendarOutline" /><ion-label>Historia</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="settings" href="/tabs/settings">
          <ion-icon :icon="is('settings') ? shieldCheckmark : shieldCheckmarkOutline" /><ion-label>Kopia</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>
<script setup>
import { IonPage, IonTabs, IonRouterOutlet, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/vue'
import { barbell, barbellOutline, statsChart, statsChartOutline, calendar, calendarOutline, shieldCheckmark, shieldCheckmarkOutline, scale, scaleOutline } from 'ionicons/icons'
import { useRoute } from 'vue-router'
const route = useRoute()
const is = t => route.path.includes('/' + t)
</script>
