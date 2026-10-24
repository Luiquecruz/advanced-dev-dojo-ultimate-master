The starter works at runtime, but its types are loose (`string` keys, `unknown` values). Complete the types
so that keys are checked and values keep their exact types. The runtime code can stay as it is.

1. `type SettingKey` — the union of the keys of `Settings`.
2. `type ThemeValue` — the type of `Settings['theme']`, using indexed access.
3. `type Role` — the union of the values in the `ROLES` constant (`"admin" | "editor" | "viewer"`), derived
   with `typeof` and `[number]`. `ROLES` must stay a readonly tuple (`as const`).
4. `getProperty<T, K extends keyof T>(obj: T, key: K): T[K]`
5. `setProperty<T, K extends keyof T>(obj: T, key: K, value: T[K]): void`
6. `pluck<T, K extends keyof T>(items: readonly T[], key: K): T[K][]`
