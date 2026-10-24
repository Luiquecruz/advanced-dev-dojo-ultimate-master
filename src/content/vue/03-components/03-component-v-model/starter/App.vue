<script setup lang="ts">
import { ref } from 'vue';
import RatingInput from './RatingInput.vue';

const rating = ref(0);
const comment = ref('');
</script>

<template>
  <!-- TODO: bind rating with v-model and comment with v-model:comment -->
  <RatingInput />
  <p class="summary">Rating: {{ rating }}</p>
  <p class="comment">{{ comment }}</p>
</template>
