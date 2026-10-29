1. Start with `/health`: one line with `c.text('ok')` proves the route table works (the `main()` demo prints it when you press **Run**).
2. For the list route, treat the query as optional text: lowercase the `author` filter, apply it, then apply `limit` only when it was sent. Set `X-Total-Count` from the final array so the header and the body agree.
3. For `/books/:id`, put the digit pattern in the path so invalid ids never reach the handler. Convert the parameter with `Number` before comparing with `book.id`, and return the specific 404 body when nothing matches.
4. For `POST /books`, parse the JSON body with `await c.req.json()`, derive the next id from the highest existing id (not from `length`, which breaks after deletions), store the book and answer `201`.
5. Check every branch ends in `return c.<helper>(...)`; a missing `return` silently becomes a 404.
