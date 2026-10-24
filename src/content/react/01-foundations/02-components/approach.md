1. Rename the function `avatar` to `Avatar` and prefix it with `export` so it becomes a named export.
2. Update the usage inside `Profile` from `<avatar />` to `<Avatar />`; otherwise React renders an unknown `<avatar>` tag.
3. Move `Profile` out of `TeamPage` to module level and export it. A component declared inside another is recreated on every render, which resets its state.
4. Leave `TeamPage` as the default export rendering the heading and two `<Profile />` elements.
