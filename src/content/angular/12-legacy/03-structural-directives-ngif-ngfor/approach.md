1. Import `NgIf` and `NgFor` so the template compiler knows the directives.
2. Guard the list with `*ngIf ... else empty` and define the `#empty` template.
3. Repeat the `<li>` with `*ngFor`, exposing `index` and wiring `trackBy`.
4. Use `*ngIf="selected as user"` to render the selection with an alias.
5. Return the stable `id` from `trackById` so NgFor reuses DOM nodes.
6. Compare each piece with its `@if`/`@for`/`@empty` equivalent.
