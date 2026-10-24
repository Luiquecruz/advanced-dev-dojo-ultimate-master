Append `as const` after the array literal and after the object literal.
---
`typeof HTTP_METHODS` gives the tuple type. Indexing it with `[number]` gives the union of all its elements.
---
`type HttpMethod = (typeof HTTP_METHODS)[number];` and a template literal `` `${request.method} ${request.url}` ``.
