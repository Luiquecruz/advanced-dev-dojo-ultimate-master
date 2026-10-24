<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';

const query = ref('');

// TODO: get the input element with useTemplateRef

function focus() {
  // TODO: focus the input element
}

function clear() {
  // TODO: empty the query and focus the input
}

// TODO: expose focus and clear
</script>

<template>
  <input v-model="query" type="search" aria-label="Search" />
</template>
