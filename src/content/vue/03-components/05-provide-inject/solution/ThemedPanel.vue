<script setup lang="ts">
import { inject, ref } from 'vue';
import { ThemeKey } from './keys';

const { theme } = inject(ThemeKey, { theme: ref('light'), toggle: () => {} });
</script>

<template>
  <section :class="['panel', theme]">
    <slot />
  </section>
</template>

<style scoped>
.panel { padding: 1rem; border-radius: 8px; }
.light { background: #fff; color: #222; }
.dark { background: #1e1e1e; color: #eee; }
</style>
