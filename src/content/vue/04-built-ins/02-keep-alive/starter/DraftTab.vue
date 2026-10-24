<script setup lang="ts">
import { ref } from 'vue';

const text = ref('');
</script>

<template>
  <textarea v-model="text" aria-label="Draft"></textarea>
  <p class="length">{{ text.length }} characters</p>
</template>
