<script setup lang="ts">
import { useTemplateRef } from 'vue';
import SearchBox from './SearchBox.vue';

const search = useTemplateRef<InstanceType<typeof SearchBox>>('search');
</script>

<template>
  <SearchBox ref="search" />
  <button @click="search?.focus()">Focus search</button>
  <button @click="search?.clear()">Clear</button>
</template>
