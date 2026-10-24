Style the dashboard in `App.vue` using `:class` and `:style`. The state and the scoped CSS are provided.

1. **Tabs.** Each tab `<button>` keeps its static `class="tab"` and gets the `active` class only when it matches `activeTab`, using the **object syntax** (`:class="{ active: ... }"`). Clicking a tab already sets `activeTab`.
2. **Alert.** The `<div class="alert">` gets, through the **array syntax**, the class `` `alert-${level}` `` (`alert-warning` initially) and the class `dismissible` only while `dismissible` is `true`. The `Make it an error` button sets `level` to `"error"`.
3. **Progress bar.** The `<div class="bar">` gets an inline `width` of `` `${progress}%` `` (`40%` initially) and a `backgroundColor` of `"green"` when `progress` reaches `100`, otherwise `"orange"`. The `+30` button increases `progress` (max 100).
