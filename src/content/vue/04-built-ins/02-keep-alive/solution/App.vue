<script setup lang="ts">
import { ref } from 'vue';
import DraftTab from './DraftTab.vue';
import StatsTab from './StatsTab.vue';

const tabs = { Draft: DraftTab, Stats: StatsTab };
const current = ref<keyof typeof tabs>('Draft');
</script>

<template>
  <button @click="current = 'Draft'">Draft</button>
  <button @click="current = 'Stats'">Stats</button>
  <KeepAlive>
    <component :is="tabs[current]" />
  </KeepAlive>
</template>
