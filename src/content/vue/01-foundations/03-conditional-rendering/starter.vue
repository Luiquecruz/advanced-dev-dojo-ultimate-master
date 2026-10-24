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

  <!-- TODO: render one status paragraph with v-if / v-else-if / v-else -->
  <p>Nothing saved yet</p>

  <!-- TODO: render the help <aside> with v-show -->
</template>
