<script setup lang="ts">
import { ref } from 'vue';
import RatingInput from './RatingInput.vue';

const rating = ref(0);
const comment = ref('');
</script>

<template>
  <RatingInput v-model="rating" v-model:comment="comment" />
  <p class="summary">Rating: {{ rating }}</p>
  <p class="comment">{{ comment }}</p>
</template>
