<script setup lang="ts">
import { onActivated, ref } from 'vue';

const activations = ref(0);

// TODO: increment activations every time this tab is activated
</script>

<template>
  <p class="activations">Activated {{ activations }} times</p>
</template>
