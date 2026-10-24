<script setup lang="ts">
import { useId } from 'vue';

// TODO: set name and inheritAttrs with defineOptions

const { label, help } = defineProps<{ label: string; help?: string }>();

// TODO: generate a unique id with useId
</script>

<template>
  <div class="form-field">
    <!-- TODO: connect the label, the input and the help text through ids -->
    <label>{{ label }}</label>
    <input />
  </div>
</template>
