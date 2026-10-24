## Binding attributes with `v-bind`

Interpolation (`{{ }}`) only works **between** tags. To put a reactive value **inside** an attribute you need the `v-bind` directive:

```vue
<script setup lang="ts">
import { ref } from 'vue';

const avatarUrl = ref('/img/ada.png');
const name = ref('Ada Lovelace');
</script>

<template>
  <img v-bind:src="avatarUrl" :alt="name" />
</template>
```

`v-bind:src` and its shorthand `:src` mean the same thing: "evaluate this JavaScript expression and keep the attribute in sync with it". Without the colon the value is a **static string**:

```vue
<img src="avatarUrl" />   <!-- the literal text "avatarUrl" -->
<img :src="avatarUrl" />  <!-- the value of the avatarUrl ref -->
```

The same rule applies to numbers and booleans. `count="5"` passes the string `"5"`, `:count="5"` passes the number `5`.

## Same-name shorthand (Vue 3.4+)

When the attribute and the variable share a name, you can drop the value:

```vue
<section :id="id"></section>
<!-- same as -->
<section :id></section>
```

## Boolean and nullish attributes

Vue knows which attributes are boolean (`disabled`, `checked`, `hidden`, `readonly`...):

```vue
<button :disabled="isBusy">Save</button>
```

- truthy value (or an empty string) → attribute is present.
- falsy value → attribute is removed.

For any attribute, binding `null` or `undefined` **removes** it from the element. This is the idiomatic way to render an attribute only sometimes:

```vue
<a :title="tooltip ?? undefined">Docs</a>
```

## Binding many attributes at once

`v-bind` without an argument spreads an object of attributes onto the element:

```vue
<script setup lang="ts">
const link = { href: 'https://vuejs.org', target: '_blank', rel: 'noopener' };
</script>

<template>
  <a v-bind="link">Vue docs</a>
</template>
```

If the element also has explicit attributes, order matters: attributes declared **after** `v-bind="..."` win.

## Dynamic attribute names

Square brackets turn the attribute name itself into an expression:

```vue
<button :[eventAttr]="value">...</button>
<a :[attributeName]="url">link</a>
```

Keep dynamic names lowercase in in-DOM templates (browsers lowercase attribute names); inside SFCs this is not a problem.

## Expressions, not statements

Any single JavaScript **expression** is allowed inside a binding:

```vue
<img :src="`/img/${user.id}.png`" :alt="user.name.toUpperCase()" />
<progress :value="done / total" />
```

Statements (`if`, `const x = 1`) are not. Bindings may only access component state and a short allow-list of globals (`Math`, `Date`, `JSON`, `Number`, ...). User-defined globals on `window` are not visible.

## Pitfalls

- **Forgetting the colon.** `<img src="url">` silently renders the literal text "url".
- **`:disabled="'false'"`.** The non-empty string `'false'` is truthy, so the button stays disabled. Bind the boolean itself.
- **Data attributes** work like any other: `:data-status="status"`.
- **Modifiers** exist for edge cases: `.prop` forces a DOM property (`:text-content.prop`), `.attr` forces an attribute, `.camel` camelizes the name.

## Options API note

Bindings are identical in both API styles. With the Options API the values come from `data()`, `computed` or props instead of `<script setup>` bindings:

```js
export default {
  data: () => ({ avatarUrl: '/img/ada.png' }),
};
```
