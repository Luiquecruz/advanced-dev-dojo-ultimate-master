<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue';
import HomeTab from './HomeTab.vue';
import ProfileTab from './ProfileTab.vue';

const SettingsTab = defineAsyncComponent(() => import('./SettingsTab.vue'));

const tabs = { Home: HomeTab, Profile: ProfileTab, Settings: SettingsTab };
const current = ref<keyof typeof tabs>('Home');
</script>

<template>
  <nav role="tablist">
    <button
      v-for="(_, name) in tabs"
      :key="name"
      role="tab"
      :aria-selected="current === name"
      @click="current = name"
    >{{ name }}</button>
  </nav>
  <div role="tabpanel">
    <component :is="tabs[current]" />
  </div>
</template>
