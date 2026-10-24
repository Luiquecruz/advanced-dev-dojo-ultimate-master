Every attribute that should read a variable needs `v-bind:` or its shorthand `:` in front of it. Without it the value is plain text.
---
Same-name shorthand: when the attribute and the variable have the same name, `:id` alone is enough. Boolean attributes such as `disabled` are added or removed based on the truthiness of the expression.
---
`<img :src="avatarUrl" :alt="name" />`, `<button :disabled="isBusy">` and `<a v-bind="link">` cover the remaining requirements.
