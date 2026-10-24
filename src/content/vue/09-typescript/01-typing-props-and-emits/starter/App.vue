<script setup lang="ts">
import { ref } from 'vue';
import RatingInput from './RatingInput.vue';

const rating = ref(2);
</script>

<template>
  <RatingInput v-model="rating" label="How was the lesson?" />
  <p>Rating: {{ rating }}</p>
</template>
