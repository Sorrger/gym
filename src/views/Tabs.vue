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
/* centre Trening tab: big round accent button that sits above the bar */
ion-tab-bar { overflow: visible !important; contain: none !important; }
.center::part(native) { overflow: visible; }
.center { overflow: visible; --color: var(--accent); --color-selected: var(--accent); }
.center .c-ico { width: 58px; height: 58px; border-radius: 50%; margin-top: -26px; margin-bottom: 1px; display: grid; place-items: center;
  background: linear-gradient(145deg, var(--accent-2, var(--accent)), var(--accent)); color: #fff;
  box-shadow: 0 6px 18px rgba(var(--accent-rgb), .45), 0 0 0 4px var(--app-bg); transition: transform .15s; }
.center .c-ico ion-icon { font-size: 28px; color: #fff; }
.center:active .c-ico { transform: scale(.92); }
.center.tab-selected .c-ico { box-shadow: 0 8px 22px rgba(var(--accent-rgb), .6), 0 0 0 4px var(--app-bg); }
.center ion-label { font-weight: 600; }
:global(ion-tabs ion-content) { --padding-bottom: 30px; } /* room for the round Trening button sticking up */
</style>
