Add `standalone: false` to both `@Component` decorators. Without it, Angular refuses to put them in `declarations`.
---
The module needs three arrays: `declarations: [BadgeComponent, UserCardComponent]`, `imports: [CommonModule]`, `exports: [UserCardComponent]`.
---
A standalone component imports a module like any other dependency: `imports: [UsersModule]` in the `App` decorator.
