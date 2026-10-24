<script setup lang="ts">
import { ref } from 'vue';
import ModalDialog from './ModalDialog.vue';

const open = ref(false);
</script>

<template>
  <div class="card">
    <p>This card clips anything that overflows it.</p>
    <button @click="open = true">Open dialog</button>
    <ModalDialog :open="open" title="Confirm" @close="open = false">
      <p>Teleported to the body!</p>
    </ModalDialog>
  </div>
</template>

<style>
.card { overflow: hidden; height: 120px; border: 1px solid #ccc; padding: 0.5rem; }
</style>
