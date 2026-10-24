## Destructuring breaks the connection

A reactive object is a Proxy: reactivity lives in **property access** (`state.count`). Destructuring reads each property once and copies the value into a plain variable:

```ts
const state = reactive({ count: 0, step: 1 });
let { count } = state; // a plain number: 0

state.count++;
console.log(count); // still 0
count++;            // does not touch state.count
```

The same happens when you pass `state.count` to a function or return `{ count: state.count }` from a composable.

## `toRefs()`

`toRefs(reactiveObject)` converts every property into a ref that is **linked** to the source: reading the ref reads the property, writing it writes the property.

```ts
import { reactive, toRefs } from 'vue';

const state = reactive({ count: 0, step: 1 });
const { count, step } = toRefs(state);

count.value++;           // state.count is now 1
state.step = 5;          // step.value is now 5
```

This is the classic way to return reactive state from a composable so callers can destructure it:

```ts
export function useCounter() {
  const state = reactive({ count: 0, step: 1 });
  const increment = () => { state.count += state.step; };
  return { ...toRefs(state), increment };
}

const { count, increment } = useCounter(); // count stays reactive
```

`toRefs` only creates refs for properties that exist **when it is called**. For optional properties use `toRef`.

## `toRef()`

`toRef` has three forms:

```ts
const count = toRef(state, 'count');        // linked ref to one property
const theme = toRef(options, 'theme', 'light'); // with a default for undefined
const double = toRef(() => state.count * 2);    // 3.3+: read-only ref from a getter
const same = toRef(existingRef);                // returns the ref as is
const plain = toRef(1);                         // like ref(1)
```

The getter form is lighter than `computed` (no caching, no extra effect): ideal for cheap derivations or for passing a single prop to a composable, e.g. `useFeature(toRef(() => props.id))`.

## `toValue()` and `MaybeRefOrGetter`

Composables often accept "a value, a ref or a getter". Vue 3.3 added `toValue()` to normalize that:

```ts
import { computed, toValue, type MaybeRefOrGetter } from 'vue';

export function useUpper(source: MaybeRefOrGetter<string>) {
  return computed(() => toValue(source).toUpperCase());
}

useUpper('vue');                   // plain value
useUpper(nameRef);                 // ref
useUpper(() => props.title);       // getter
```

`toValue` calls getters and unwraps refs. Calling it **inside** `computed` / `watchEffect` makes the read reactive. `unref()` is the older helper; it unwraps refs but does not call getters.

## Props destructure (Vue 3.5)

In `<script setup>`, destructuring `defineProps()` is special: the compiler rewrites `count` into `props.count`, so it stays reactive:

```ts
const { count = 0 } = defineProps<{ count?: number }>();
watch(() => count, ...); // wrap it in a getter to watch or pass it on
```

This is compile-time magic for props only. Destructuring `reactive()` or a store still needs `toRefs` (or Pinia's `storeToRefs`).

## When to reach for what

| Situation | Tool |
| --- | --- |
| Return reactive object fields from a composable | `toRefs` |
| One property, maybe missing | `toRef(obj, 'key', default)` |
| Cheap derived read-only ref | `toRef(() => ...)` |
| Accept value / ref / getter as input | `MaybeRefOrGetter` + `toValue` |
| Destructure props in `<script setup>` | plain destructuring (3.5+) |

Many teams avoid the problem altogether by returning **plain refs** from composables (`const count = ref(0)`), which can always be destructured.
