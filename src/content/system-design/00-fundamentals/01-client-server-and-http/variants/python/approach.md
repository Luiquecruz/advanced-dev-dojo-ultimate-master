1. Route by path before method: the path tells you which resource is addressed, and only then does "is this method allowed here?" make sense. That ordering is what separates `404` (no such resource) from `405` (resource exists, method does not).
2. For the collection, keep `GET` and `POST` as the only accepted methods and send every other method to one shared `405` response.
3. Validate the input before changing state: an invalid `POST` must return `400` and leave the list untouched, so the `400` check comes before the id counter moves.
4. For a single note, parse the id from the path, look it up once and reuse the result for both `GET` (return it) and `DELETE` (remove it, answer `204` without a body).
5. Keep a final fallback of `404 not found` for any path that matched nothing.
