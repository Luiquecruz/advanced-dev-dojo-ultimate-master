1. Freeze the role list with `as const` so its elements keep their literal types.
2. Derive `SettingKey`, `ThemeValue` and `Role` with `keyof`, indexed access and `[number]`.
3. Replace `any` and `string` in the helpers with `T` and `K extends keyof T`.
4. Use `T[K]` for read results, written values and plucked arrays.
