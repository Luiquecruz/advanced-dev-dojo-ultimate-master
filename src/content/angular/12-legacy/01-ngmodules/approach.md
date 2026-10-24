1. Opt both card components out of the standalone default with `standalone: false`.
2. Declare them in `UsersModule` so they share a compilation context (the card can use `<app-badge>`).
3. Import `CommonModule` in the module for the `uppercase` pipe.
4. Export only `UserCardComponent`, keeping `BadgeComponent` an implementation detail.
5. Import `UsersModule` into the standalone `App` to bridge legacy and modern code.
