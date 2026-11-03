Build a small **GraphRAG**: detect communities in an entity graph, summarize each community with a model, route questions to local or global search, answer local questions from an entity's neighborhood and global questions with map-reduce over community reports. The model is passed in as a parameter (the tests pass `createModel()` from `@dojo/ai`).

## Data shapes

- Graph: `{ entities, relations }`. An entity is `{ id, name, type, description }`; a relation is `{ source, target, type }` with entity ids. For communities and neighborhoods, relations are **undirected**; ignore self-loops and relations to unknown ids.
- Community: `{ id, members }` (member ids). Report: `{ communityId, title, summary, members, fallback }`.

## 1. `detectCommunities(graph, { maxIterations = 20 })`

Weighted label propagation with a fixed order:

1. Every entity starts with its own id as label. The weight of an edge between `u` and `v` is `1 + the number of neighbors u and v share`.
2. Repeat up to `maxIterations` passes. In a pass, visit the entity ids in ascending order (`sort()`); for an entity with neighbors, sum the weights per neighbor label and adopt the label with the highest total, ties going to the smallest label. Stop after a pass in which no label changed.
3. Entities sharing a label form a community; `members` are sorted ascending. Sort communities by size (largest first), then by first member, and number them `community-1`, `community-2`...

Entities without neighbors stay alone. The result must not depend on the order of `entities` or `relations`.

## 2. `summarizeCommunities(model, graph, communities)`

For each community, in order, call the model with `responseFormat: { type: 'json' }` and a prompt that contains every member's name, type and description and every relation whose both ends are members (with its type), and **nothing about entities outside the community**. Expect `{ "title": "...", "summary": "..." }` (parse the text between the first `{` and the last `}`).

- A reply is usable when both fields are non-empty strings: return `{ communityId, title, summary, members, fallback: false }`.
- Otherwise call once more with the same request. After two unusable replies, or at once on a `refusal` or `content_filter`, build a fallback report: `title` is the names of the up to 3 members with the most neighbors inside the community (ties by name), joined with `', '`; `summary` contains every member name; `fallback: true`.

## 3. `routeQuestion(question, graph)`

When the question contains entity names as whole words, ignoring case (`'Acme'` matches `acme?` but not `Acmeco`), return `{ mode: 'local', entityIds }` with their ids in entity order. Otherwise return `{ mode: 'global' }`.

## 4. `answerLocal(model, question, graph, entityIds, { hops = 1 })`

Collect the given entities plus every entity within `hops` hops (breadth first, discovery order). Call the model once with a prompt containing the name, type and description of each collected entity, every relation between collected entities (with its type) and the question. Return `{ mode: 'local', answer: <reply text>, entityIds: <collected ids> }`.

## 5. `answerGlobal(model, question, reports, { batchSize = 2, maxPoints = 5 })`

- **Map:** split `reports` into batches of `batchSize`, in order. For each batch, call the model (in batch order) with `responseFormat: { type: 'json' }` and a prompt holding that batch's report titles and summaries and the question, asking for `{ "points": [{ "text", "score" }] }` with scores from 0 to 100. Skip a batch whose reply is refused, does not parse or has no `points` array. Keep points with a non-empty `text` and a numeric `score` above 0.
- **Filter:** sort points by score, highest first (ties keep their order), and keep the first `maxPoints`.
- **Reduce:** with no points left, return `{ mode: 'global', answer: null, points: [] }` without calling the model. Otherwise call the model once with the kept points in that order and the question, and return `{ mode: 'global', answer: <reply text>, points: <kept points as { text, score }> }`.

The tests check communities on bridged and random graphs, prompt isolation, fallbacks, routing and the map-reduce flow across seeds, never the wording of a reply.
