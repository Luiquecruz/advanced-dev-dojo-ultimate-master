<script setup lang="ts">
import { ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';

const draft = ref('');

onBeforeRouteLeave(() => {
  if (draft.value !== '' && !window.confirm('Discard unsaved changes?')) {
    return false;
  }
});
</script>

<template>
  <h1>Editor</h1>
  <textarea v-model="draft" aria-label="Draft"></textarea>
</template>
