Keep three pieces of state in the closure of `createShell`: the registrations (`Map` by name), the loaded micro-frontends (`Map` of name → promise) and the `unmount` function of the one currently mounted.
---
Cache the **promise**, not the resolved module: `if (!loaded.has(name)) loaded.set(name, registration.load()); return loaded.get(name);`. Two quick navigations then share one download. Bonus: delete the entry when it rejects, so a later visit can retry.
---
Wrap both `await loadOnce(...)` and `microFrontend.mount(section, { path })` in one `try/catch`; in the `catch`, put a `<p role="alert">` with `Failed to load ${name}` into the section. Without the catch, one team's bug rejects the shell's navigation.
---
Store the listener in a named function so `destroy()` can remove it: `function handleNavigationRequest(event) { navigate(event.detail.path); }`, `window.addEventListener('mfe:navigate', handleNavigationRequest)` when the shell is created.
