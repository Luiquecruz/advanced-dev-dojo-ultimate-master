Build a small NgModule-based feature in `app.ts` and use it from a standalone component.

1. `BadgeComponent` (selector `app-badge`) and `UserCardComponent` (selector `app-user-card`) must be **non-standalone**: add `standalone: false`.
2. `UsersModule`:
   - `declarations`: `BadgeComponent` and `UserCardComponent`
   - `imports`: `CommonModule` (the card template uses the `uppercase` pipe)
   - `exports`: only `UserCardComponent` (the badge stays private)
3. The standalone `App` component (selector `app-root`) imports `UsersModule` so its template can render two `<app-user-card>` elements.

The rendered result shows `<h3>ADA LOVELACE</h3>` and `<h3>ALAN TURING</h3>`, each with an `<app-badge>` containing the role (`Admin`, `Member`).
