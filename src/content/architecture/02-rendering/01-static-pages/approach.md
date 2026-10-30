1. Normalize the input first: drop everything after `?` or `#`, then decode. Every later step works on the decoded path, so encoded tricks are seen in their real form.
2. Reject traversal before touching the files object. A key named `../secrets.env` exists in the test data on purpose: it stands for a file outside the web root, and a plain lookup would happily return it.
3. Resolve the path to a key: remove leading slashes, append `index.html` for the root and trailing slashes, and fall back to `<path>/index.html` when the exact key is missing but the folder index exists.
4. Missing key → 404 with the `404.html` body (or `'Not Found'`) and HTML headers, so crawlers see a real 404 instead of a soft one.
5. Found key → 200 with headers derived from the file name: the content type from the extension map, and the cache policy from three rules in order (HTML, fingerprinted, everything else).
6. Keep the helpers small and pure (`extensionOf`, `cacheControlFor`, `resolveFilePath`): they are exactly the rules a real Nginx or CDN configuration expresses.
