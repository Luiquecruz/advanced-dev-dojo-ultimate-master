1. Implement `viewProduct` as an Immer recipe passed to `set`, and give it an action name so it shows up in the DevTools timeline.
2. Combine the slices in one initializer and apply middleware once around it: `persist` inside, `devtools` outside so it records every update.
3. Decide what deserves to survive a reload: preferences and recent ids yes, the settings panel flag no. Encode it in `partialize`.
4. Version the persisted shape and write the migration from version 1, removing the obsolete `darkMode` key.
5. Replace the singleton with a factory and a provider that creates one store per instance; the context carries a reference that never changes, so selectors keep controlling re-renders.
6. Guard the hook so a missing provider fails loudly.
