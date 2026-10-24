`type SettingKey = keyof Settings;` and `type ThemeValue = Settings['theme'];`. For roles, add `as const` to the array and use `(typeof ROLES)[number]`.
---
Each helper needs two type parameters: the object type `T` and a key `K extends keyof T`. The value type at that key is `T[K]`.
---
`function pluck<T, K extends keyof T>(items: readonly T[], key: K): T[K][]` — the body does not change.
