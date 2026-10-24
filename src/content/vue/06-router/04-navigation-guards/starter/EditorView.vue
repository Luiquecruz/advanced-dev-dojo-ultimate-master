<script setup lang="ts">
import { ref } from 'vue';

const draft = ref('');

// TODO: before leaving this route with a non-empty draft, ask window.confirm('Discard unsaved changes?')
// TODO: cancel the navigation when the user does not confirm
</script>

<template>
  <h1>Editor</h1>
  <textarea v-model="draft" aria-label="Draft"></textarea>
</template>
