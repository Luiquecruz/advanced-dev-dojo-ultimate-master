<script setup lang="ts">
import { inject, ref } from 'vue';
import { ThemeKey } from './keys';

// TODO: inject the theme context with a light default
</script>

<template>
  <!-- TODO: add the panel class and the current theme class -->
  <section class="panel">
    <slot />
  </section>
</template>
