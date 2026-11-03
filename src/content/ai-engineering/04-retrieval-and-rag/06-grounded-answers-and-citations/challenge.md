Turn retrieved passages into a grounded, cited answer: send numbered sources, validate the citations in the reply, repair once, and refuse when there is no evidence.

A passage is `{ id, source, text, score }`. `model` is any object with `generate(request)`; the tests pass `createModel()` from `@dojo/ai`.

## 1. `buildContext(passages, { minScore = 0.3, maxPassages = 4 })`

Keep the passages whose `score` is at least `minScore`, sort them from the highest score to the lowest, keep the first `maxPassages`, and number them from 1. Return `{ sources, context }`:

- `sources`: `{ number, id, source, text }` for each kept passage, in order.
- `context`: one block per source, `` `[${number}] (${source}) ${text}` ``, joined with a blank line (`'\n\n'`). Empty string when there are no sources.

## 2. `extractCitations(text)`

The numbers of every `[n]` marker in the text (`n` is one or more digits), without duplicates, in order of first appearance. `'... [2] ... [1] ... [2]'` gives `[2, 1]`.

## 3. `answerWithCitations(model, question, passages, options)`

`options` are the `buildContext` options. Returns `{ status, answer, citations, attempts }`.

1. Build the context. If there are no sources, return `{ status: 'no_evidence', answer: null, citations: [], attempts: 0 }` **without calling the model**.
2. Send two messages: a `system` message telling the model to answer only from the numbered sources and to cite them as `[n]`, and a `user` message containing the context and the question.
3. A reply is **valid** when its `finishReason` is `'stop'`, it cites at least one number, and every cited number belongs to a provided source.
4. For a valid reply, return `{ status: 'answered', answer: text, citations, attempts }`, where `citations` lists `{ number, id, source }` for each cited number in order of first appearance, and `attempts` is the number of model calls made.
5. For an invalid first reply, call the model once more with the same messages plus the reply as an `assistant` message and a `user` message that names the valid source numbers as `[1]`, `[2]`, ... and asks for an answer citing only them.
6. If the second reply is also invalid, return `{ status: 'ungrounded', answer: null, citations: [], attempts: 2 }`.

Errors thrown by the model are not handled here: let them propagate.
