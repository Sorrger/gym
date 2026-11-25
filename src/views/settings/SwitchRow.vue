<!-- one settings row with an iOS switch for a true/false preference -->
<template>
  <button class="row press" role="switch" :aria-checked="!!prefs[k]" @click="setPref(k, !prefs[k])">
    <div class="grow"><b>{{ t }}</b><span>{{ d }}</span></div>
    <span class="sw-t" :class="{ on: prefs[k] }"><i></i></span>
  </button>
</template>

<script setup>
import { prefs } from '../../prefs'
import { setPref } from '../../account'
defineProps({ k: String, t: String, d: String })
</script>
