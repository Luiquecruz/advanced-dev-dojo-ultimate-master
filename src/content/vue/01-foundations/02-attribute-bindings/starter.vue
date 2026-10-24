<script setup lang="ts">
import { ref } from 'vue';

const id = 'profile-ada';
const name = ref('Ada Lovelace');
const avatarUrl = ref('/img/ada.png');
const isBusy = ref(true);
const link = { href: 'https://vuejs.org', target: '_blank' };
</script>

<template>
  <!-- TODO: bind the id with the same-name shorthand -->
  <section>
    <!-- TODO: bind src and alt -->
    <img />
    <h2>{{ name }}</h2>
    <!-- TODO: disable while isBusy is true -->
    <button>Save</button>
    <button @click="isBusy = false">Finish</button>
    <!-- TODO: spread the link object -->
    <a>Vue docs</a>
  </section>
</template>
