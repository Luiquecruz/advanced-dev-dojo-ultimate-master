<script setup lang="ts">
import FormField from './FormField.vue';
</script>

<template>
  <form>
    <FormField label="Email" type="email" help="We never share it" />
    <FormField label="Password" type="password" />
  </form>
</template>
