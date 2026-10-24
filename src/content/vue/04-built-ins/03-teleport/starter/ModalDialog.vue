<script setup lang="ts">
const { open, title } = defineProps<{ open: boolean; title: string }>();

// TODO: declare the close event
</script>

<template>
  <!-- TODO: teleport the backdrop and dialog to body, only when open -->
  <div class="backdrop">
    <div role="dialog" aria-modal="true" :aria-label="title">
      <h2>{{ title }}</h2>
      <slot />
      <button>Close</button>
    </div>
  </div>
</template>
