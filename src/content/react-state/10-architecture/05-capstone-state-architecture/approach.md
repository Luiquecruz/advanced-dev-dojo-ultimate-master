1. Classify every piece of state first: products (server), search and category (URL), typed draft and panel toggle (local), cart (shared client), count/total/visible list (derived).
2. Server: key the products query by the submitted search, `['products', q]`, so each search is cached separately and revisits are instant.
3. Client store: implement `add` and `remove` immutably and keep only cart data in the store; expose `selectCount` and `selectTotal` so the panel derives its numbers.
4. URL: read `q` and `category` from `useSearchParams` and write them with a functional updater that deletes default values, so URLs stay clean and shareable.
5. Local: keep the draft inside `SearchForm` and commit it to the URL only on submit; `key={q}` resets it when the URL changes from elsewhere.
6. Derived: filter the cached products by category in render. The API does not filter by category, so no request is needed.
7. Verify each boundary: URL in and out, request counts, cache contents and store contents.
