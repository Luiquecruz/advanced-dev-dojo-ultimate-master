<script setup lang="ts">
import { inject } from 'vue';
import { ThemeKey } from './keys';

const { theme, toggle } = inject(ThemeKey)!;
</script>

<template>
  <button @click="toggle">Switch to {{ theme === 'light' ? 'dark' : 'light' }}</button>
</template>
