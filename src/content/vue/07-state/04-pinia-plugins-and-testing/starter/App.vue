<script setup lang="ts">
import { useSettingsStore } from './stores';

const settings = useSettingsStore();
</script>

<template>
  <p>Theme: {{ settings.theme }}</p>
  <button @click="settings.toggleTheme()">Toggle theme</button>
</template>
