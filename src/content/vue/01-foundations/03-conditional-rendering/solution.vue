<script setup lang="ts">
import { ref } from 'vue';

const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle');
const showHelp = ref(false);
</script>

<template>
  <div>
    <button @click="status = 'loading'">Load</button>
    <button @click="status = 'success'">Succeed</button>
    <button @click="status = 'error'">Fail</button>
    <button @click="showHelp = !showHelp">Toggle help</button>
  </div>

  <p v-if="status === 'loading'">Loading...</p>
  <p v-else-if="status === 'error'" role="alert">Something went wrong</p>
  <p v-else-if="status === 'success'">Saved!</p>
  <p v-else>Nothing saved yet</p>

  <aside v-show="showHelp">Press ? for shortcuts</aside>
</template>
