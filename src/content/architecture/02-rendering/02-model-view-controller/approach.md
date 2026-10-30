1. Separate the three questions a request raises: what data (model), what markup (view), which page and status (controller). Each file answers exactly one.
2. Finish the model first. Hiding the missing detail endpoint inside `findProductById` keeps that API quirk out of the controller; if the API gains `/api/products/:id` later, only the model changes.
3. Write the views as pure functions of their props. Rendering them with `renderToStaticMarkup` in isolation (as one test does) proves they need nothing but data, which is what makes MVC views easy to test.
4. Let React escape user input: render `{query}` as text and `defaultValue={query}` as an attribute; never build HTML strings from the query yourself.
5. In the controller, parse the URL once, normalize the trailing slash, and dispatch: list route, detail route with a digits-only pattern, then the 404 fallback.
6. Map "not found" to status `404` in the controller, not in the view: the status is part of the request flow, while the view only decides what the page looks like.
7. Notice what is missing: no `useEffect`, no state, no client JavaScript. Every link and the search form trigger a full page request, which is the MPA trade-off the next lesson removes.
