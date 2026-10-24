1. Replace the anchors with `NavLink`s so navigation stays client-side and active links get `aria-current`.
2. Add `end` to the Home link, otherwise it matches every path.
3. Declare the `/about` route and a `*` route for everything else.
4. In `NotFound`, call `useNavigate()` and navigate to `/` on click.
