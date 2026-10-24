Fallback content goes between the slot tags: `<slot name="header">Untitled</slot>`. Check `$slots.footer` with `v-if` to skip the empty footer.
---
Pass data to a slot by binding attributes on it: `<slot name="item" :item="item" :index="index">{{ item.name }}</slot>`.
---
In the parent, destructure the slot props: `<template #item="{ item, index }">{{ index + 1 }}. {{ item.name }} (${{ item.price }})</template>`. Content outside named templates goes to the default slot.
