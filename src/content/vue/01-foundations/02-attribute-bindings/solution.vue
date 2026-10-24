<script setup lang="ts">
import { ref } from 'vue';

const id = 'profile-ada';
const name = ref('Ada Lovelace');
const avatarUrl = ref('/img/ada.png');
const isBusy = ref(true);
const link = { href: 'https://vuejs.org', target: '_blank' };
</script>

<template>
  <section :id>
    <img :src="avatarUrl" :alt="name" />
    <h2>{{ name }}</h2>
    <button :disabled="isBusy">Save</button>
    <button @click="isBusy = false">Finish</button>
    <a v-bind="link">Vue docs</a>
  </section>
</template>
