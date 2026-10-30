Immutability means "copy, then change the copy". `{ ...adr, status: 'accepted' }` creates a new object; `adr.status = ...` changes the caller's record.
---
Guard every transition before returning: check `adr.status !== 'proposed'` in `accept`, and in `supersede` check that the old ADR exists (`log.find`) and is `'accepted'`. Throw `new Error(...)` with the exact phrases from the challenge.
---
For `supersede`, build the new log with `log.map(...)` (replace only the matching id with a superseded copy) and spread it into a new array followed by the new ADR. You can reuse `accept(newAdr)` and add `supersedes: oldId` to the result.
---
For `toMarkdown`, build an array of lines (`# ${adr.id}. ${adr.title}`, `''`, `'## Status'`, ...) and `join('\n')`. A small helper can turn `'accepted'` into `Accepted` and a superseded record into `Superseded by ADR ${adr.supersededBy}`.
