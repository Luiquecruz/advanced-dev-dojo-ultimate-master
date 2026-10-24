A route is a plain object: `{ path: 'about', component: About, title: 'About' }`. Order matters: the router picks the **first** match, so the wildcard `'**'` goes last.
---
A redirect has no component: `{ path: 'home', redirectTo: '', pathMatch: 'full' }`. Without `pathMatch: 'full'` an empty-path redirect would match every URL.
---
The directives you use in the template must be listed in `imports`: `[RouterOutlet, RouterLink, RouterLinkActive]`.
---
`<a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Home</a>` keeps Home from staying active on `/about` (every URL starts with `/`).
