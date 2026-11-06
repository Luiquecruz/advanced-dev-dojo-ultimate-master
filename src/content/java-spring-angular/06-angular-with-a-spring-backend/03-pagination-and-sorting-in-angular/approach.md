1. Write `toQueryParams` as a pure function. It is the one place that knows the names `page`, `size` and `sort` and the `property,direction` format, so it is easy to test on its own.
2. Create the resource with a request function that reads `pageIndex()` and `sort()`. Reading signals inside the function is what makes the resource send a new request when they change.
3. Derive the buttons' state instead of storing it: `hasPrevious` from the index, `hasNext` from the index and the `totalPages` that the server reported. Guard the read with `hasValue()`, because a loading or failed resource has no value.
4. Implement `next` and `previous` with `update`, which reads the current index and writes the new one.
5. Implement `sortBy` with the toggle rule and reset the page index to 0: a different order produces different rows, so the old page number has no meaning.
6. Check the first request in the tests: page 0 is the first page for Spring, and the label adds one for people.
