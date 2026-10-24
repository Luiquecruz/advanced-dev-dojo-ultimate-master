Each route record is an object: `{ path: '/about', name: 'about', component: AboutView }`.
---
A catch-all path uses a custom regex param: `'/:pathMatch(.*)*'`. It matches anything the previous records did not.
---
Named links take a location object: `<RouterLink :to="{ name: 'about' }">About</RouterLink>`. Do not forget the `:` so the value is evaluated as JavaScript.
---
`<RouterView />` is a placeholder: it renders whatever component the current route matched. Put it inside `<main>`.
