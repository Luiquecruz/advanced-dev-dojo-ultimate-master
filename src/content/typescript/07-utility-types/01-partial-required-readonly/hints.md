Annotate the constant as `Readonly<Required<UserSettings>>`; the compiler will then ask for `notifications` and `fontSize`.
---
`updateSettings` can be one line: `return Object.freeze({ ...current, ...changes });`.
---
Spreading would copy an explicit `undefined`. Build the resolved object field by field: `fontSize: settings.fontSize ?? DEFAULT_SETTINGS.fontSize`.
