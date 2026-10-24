In `<script setup>` you can write `const response = await fetch(...)` at the top level. Throw when `!response.ok`.
---
`<Suspense>` takes two slots: the default one (your async component) and `<template #fallback>`.
---
`onErrorCaptured((err) => { error.value = err.message; return false; })`, then `v-if="error"` on the alert and `v-else` on `<Suspense>`.
