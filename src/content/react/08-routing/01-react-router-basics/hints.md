Swap each `<a href="...">` for `<NavLink to="...">`. Add the `end` prop to the Home link so it is only active on exactly `/`.
---
Add `<Route path="/about" element={<h1>About</h1>} />` and a catch-all `<Route path="*" element={<NotFound />} />`.
---
In `NotFound`: `const navigate = useNavigate();` and `<button onClick={() => navigate('/')}>Go home</button>`.
