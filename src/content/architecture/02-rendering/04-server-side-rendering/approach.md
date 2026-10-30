1. Identify where each step happens in the starter: data is fetched in the browser and the server sends an empty `#root`. SSR moves both the fetch and the first render to the server.
2. In `handleRequest`, await the data, render the app with `renderToString`, and place the string inside `#root`. The HTML now contains the product names before any JavaScript runs.
3. Hand the data to the client in the document itself. A `type="application/json"` script is inert (the browser never executes it) and easy to read with `textContent`.
4. Escape before embedding: replacing `<` with `<` keeps the JSON valid and makes `</script>` impossible inside it. Test it with a hostile product name.
5. On the client, read and parse the embedded data and call `hydrateRoot` with exactly the same props. Same props means the same first render, which means React can adopt the existing nodes instead of replacing them.
6. Remove the client fetch entirely: no `useEffect` refetch, no `createRoot`. Check the result: no mismatch logged, the same `<button>` node responds to clicks, and zero `/api` requests from the browser.
