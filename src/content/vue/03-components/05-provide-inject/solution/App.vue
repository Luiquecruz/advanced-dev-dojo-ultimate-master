<script setup lang="ts">
import { provide, readonly, ref } from 'vue';
import { ThemeKey } from './keys';
import ThemedPanel from './ThemedPanel.vue';
import ThemeToggle from './ThemeToggle.vue';

const theme = ref<'light' | 'dark'>('light');

provide(ThemeKey, {
  theme: readonly(theme),
  toggle: () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
  },
});
</script>

<template>
  <ThemedPanel>
    <h2>Settings</h2>
    <ThemeToggle />
  </ThemedPanel>
</template>
