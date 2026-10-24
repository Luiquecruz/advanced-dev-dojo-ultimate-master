<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue';
import HomeTab from './HomeTab.vue';
import ProfileTab from './ProfileTab.vue';

// TODO: load SettingsTab lazily with defineAsyncComponent

// TODO: map tab names to components and track the current tab name
</script>

<template>
  <nav role="tablist">
    <!-- TODO: one button per tab -->
  </nav>
  <div role="tabpanel">
    <!-- TODO: render the active tab with <component :is> -->
  </div>
</template>
