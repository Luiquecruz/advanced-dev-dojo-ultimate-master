## Dynamic segments

Most apps have pages whose URL contains data: `/users/42`, `/posts/vue-router-5`. A **param** is a path segment that starts with `:`:

```ts
{ path: '/users/:id', name: 'user', component: UserView }
```

Inside the component, `useRoute().params.id` holds `'42'`. Params are **always strings** (or arrays of strings for repeatable params); convert them yourself when you need a number.

Navigate to a param route by name so you never build URLs by hand:

```vue
<RouterLink :to="{ name: 'user', params: { id: user.id } }">{{ user.name }}</RouterLink>
```

## Custom regex, optional and repeatable params

```ts
'/users/:id(\\d+)'        // only digits: /users/abc does not match
'/users/:id?'             // optional: /users and /users/7
'/docs/:chapters+'        // one or more segments -> params.chapters is string[]
'/:pathMatch(.*)*'        // catch-all (404)
```

Regex params also fix ambiguity: `/:orderId(\\d+)` and `/:productName` can live side by side.

## Query and hash

`/search?q=vue&page=2#results` gives `route.query` → `{ q: 'vue', page: '2' }` and `route.hash` → `'#results'`. Query values are not part of the route definition; any route accepts them.

```ts
router.push({ name: 'search', query: { q: 'vue', page: 2 } });
```

## Decoupling with `props: true`

Reading `useRoute()` inside a component ties it to the router: it cannot be reused or tested without one. Pass params as props instead:

```ts
{ path: '/users/:id', component: UserView, props: true }                    // params -> props
{ path: '/search', component: SearchView, props: (route) => ({ q: route.query.q }) } // function mode
{ path: '/promo', component: PromoView, props: { banner: true } }                     // static object
```

```vue
<script setup lang="ts">
const props = defineProps<{ id: string }>();
</script>
```

Now `UserView` is an ordinary component; the router is just one of its callers.

## Pitfall: the component is reused

Going from `/users/1` to `/users/2` matches the same record, so Vue Router **reuses** the existing `UserView` instance. Lifecycle hooks like `onMounted` do not run again, and the page keeps showing user 1.

```ts
// ❌ only runs on the first visit
onMounted(() => load(props.id));

// ✅ runs now and on every change
watch(() => props.id, (id) => load(id), { immediate: true });
```

Alternatives: the in-component guard `onBeforeRouteUpdate((to) => load(to.params.id))`, or forcing a new instance with `<RouterView :key="$route.fullPath" />` (simple, but it throws away all component state on each navigation).

## Legacy vs modern

In the Options API you would write `this.$route.params.id` and a `watch: { '$route.params.id': ... }` option. With the Composition API, `useRoute()` and `props: true` replace `this.$route`, and watchers work on getters. When file-based routing is enabled (Vue Router 5), `pages/users/[id].vue` declares the same `:id` param through its file name.
