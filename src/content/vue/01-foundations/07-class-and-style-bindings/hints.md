Static and bound classes merge: keep `class="tab"` and add `:class="{ active: ... }"` next to it. The value is a boolean expression comparing `tab` with `activeTab`.
---
The array syntax accepts strings and objects together: ``:class="[`alert-${level}`, { dismissible }]"``. `{ dismissible }` is the object shorthand for `{ dismissible: dismissible }`.
---
Style objects need units: ``:style="{ width: `${progress}%`, backgroundColor: progress >= 100 ? 'green' : 'orange' }"``.
