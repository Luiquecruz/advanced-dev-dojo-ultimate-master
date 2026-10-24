Maintain a legacy template: build `UserListComponent` (selector `app-user-list`) in `app.ts` with the **CommonModule structural directives**, not `@if`/`@for`.

1. Add `NgIf` and `NgFor` to the component `imports`.
2. Render a `<ul>` with `*ngIf="users.length > 0; else empty"`.
3. Inside it, one `<li>` per user with `*ngFor="let user of users; let i = index; trackBy: trackById"` showing `1. Ada Lovelace` (index + 1, dot, name). Clicking an item calls `select(user)`.
4. An `<ng-template #empty>` with `<p>No users found</p>`.
5. A `<p *ngIf="selected as user">Selected: {{ user.name }}</p>`.
6. Make `trackById` return `user.id`, so replacing `users` with new objects with the same ids keeps the existing `<li>` elements.
