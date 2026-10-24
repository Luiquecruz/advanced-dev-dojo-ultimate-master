`const name = ref('Vue')` creates reactive state. Top-level bindings in `<script setup>` are visible in the template.
---
Interpolate with double curly braces: `{{ name }}`. Refs are unwrapped in the template, no `.value` needed.
---
`@click="count++"` is shorthand for `v-on:click` and runs the inline expression.
