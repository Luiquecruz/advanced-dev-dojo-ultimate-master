<script setup lang="ts">
import { provide, readonly, ref } from 'vue';
import { ThemeKey } from './keys';
import ThemedPanel from './ThemedPanel.vue';
import ThemeToggle from './ThemeToggle.vue';

// TODO: create the theme ref and provide { theme: readonly(theme), toggle } with ThemeKey
</script>

<template>
  <ThemedPanel>
    <h2>Settings</h2>
    <ThemeToggle />
  </ThemedPanel>
</template>
