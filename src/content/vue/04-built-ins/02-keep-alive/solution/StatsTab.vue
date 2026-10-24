<script setup lang="ts">
import { onActivated, ref } from 'vue';

const activations = ref(0);

onActivated(() => {
  activations.value++;
});
</script>

<template>
  <p class="activations">Activated {{ activations }} times</p>
</template>
