1. Treat every path from a request as hostile: compute the final absolute path first, and only then decide whether it is allowed.
2. Use `resolve` so `..` segments and absolute inputs are applied exactly as the file system would apply them.
3. Check containment with the root plus the separator (or equality with the root itself), which also rejects sibling folders sharing a prefix.
4. For URLs, let `URL` do the joining: normalize the base to end with `/` so relative resolution appends instead of replacing the last segment, and let `searchParams` do all encoding.
5. In `staticFilePath`, the order matters: parse (drops the query), decode (turns `%2f` into `/`), add `index.html`, then run the guard on the decoded value.
6. Choose the content type from `extname` lowercased with a safe binary default, so unknown files are downloaded rather than rendered.
