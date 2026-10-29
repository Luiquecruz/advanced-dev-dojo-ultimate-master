1. Start with `matchRoute`, a pure function: segment-by-segment comparison with captures is easy to test in isolation.
2. Write `readJsonBody` as a series of guards in the order a server can apply them: media type before reading, size while reading, syntax after reading.
3. Let the stream decode (`setEncoding('utf8')`) so multi-byte characters survive chunk boundaries, and measure each chunk with `Buffer.byteLength` so the limit is in bytes, not characters.
4. In the dispatcher, first find every route matching the path; that single list answers both questions: is it a 404 (empty) or a 405 (no method match, and its methods form the `Allow` header).
5. Wrap only the handler call in `try/catch`: expected failures (`HttpError`) keep their status and message, everything else is logged and becomes a generic 500 so internals never leak.
6. Implement the two user routes on top of the helpers: convert `params.id` with `Number`, validate `name` after parsing (valid JSON is not valid data), compute the next id from the highest one and answer `201`.
