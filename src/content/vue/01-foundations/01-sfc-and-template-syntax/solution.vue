<script setup lang="ts">
import { ref } from 'vue';

const name = ref('Vue');
const count = ref(0);
</script>

<template>
  <h1>Hello, {{ name }}!</h1>
  <button @click="count++">Clicked {{ count }} times</button>
</template>
