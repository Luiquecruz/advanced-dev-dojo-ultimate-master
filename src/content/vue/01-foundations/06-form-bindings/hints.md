Every field gets `v-model="<ref name>"`. Modifiers come after a dot: `v-model.trim`, `v-model.number`.
---
Both radios use the same `v-model="plan"`; their `value` attribute decides what is stored. Because `plan` starts as `"free"`, Vue checks the Free radio for you.
---
A checkbox bound to a boolean ref toggles it; checkboxes bound to the same array ref push and remove their `value`. The `<select>` gets `v-model="country"`.
