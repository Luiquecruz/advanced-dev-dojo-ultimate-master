1. Remove the conditional rendering so both panels are always part of the tree.
2. Wrap each panel in `<Activity>` and compute its `mode` from the active tab.
3. Rely on Activity semantics: hidden panels keep state and DOM but get `display: none`, and their effects are cleaned up until they become visible again.
