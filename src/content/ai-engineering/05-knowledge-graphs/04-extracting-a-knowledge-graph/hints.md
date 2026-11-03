Start with the pure parts. `normalizeName` is a chain: `normalize('NFD')`, `replace(/[̀-ͯ]/g, '')`, `toLowerCase()`, `replace(/[^a-z0-9]+/g, ' ')`, `trim()`, `split(' ')`, then two small loops over the word list. `parseExtraction` slices with `indexOf('{')` and `lastIndexOf('}')`, wraps `JSON.parse` in a `try`, and checks `Array.isArray` on both fields.
---
`extractGraph` is a loop from 1 to `maxAttempts`. Keep the original request and a `messages` variable. Check `finishReason` first (refusals throw). In the `catch` of `parseExtraction`, rebuild `messages` as the original messages plus the assistant reply plus a correction, and loop. After the loop, throw.
---
In `validateExtraction`, build a `Map` from normalized name (and alias) to type while accepting entities. A relation then needs one `find` in the ontology relations and two map lookups; compare the looked-up types with `domain` and `range`.
---
In `mergeExtraction`, for each entity compute `names = [entity.name, ...(entity.aliases ?? [])]`, resolve with the first name that matches, or create. Record each name in a local `Map` from normalized name to stored id (only when not set yet), which the relation loop uses to turn names into ids. `buildKnowledgeGraph` wraps `extractGraph` in a `try`/`catch` that pushes to `failed` and `continue`s.
