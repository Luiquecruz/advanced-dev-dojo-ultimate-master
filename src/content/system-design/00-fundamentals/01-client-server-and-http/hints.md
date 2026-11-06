Split `handle` by path first: `/notes` (the collection), `/notes/<id>` (one note, match it with `/^\/notes\/(\d+)$/`) and everything else (`404 not found`). Inside each branch, decide by method.
---
In the collection branch, `GET` lists and `POST` creates; any other method is `405`. Before creating, check `typeof text === 'string' && text.trim() !== ''` and answer `400` otherwise.
---
In the note branch, reject methods other than `GET` and `DELETE` with `405` before looking the note up. Then `findIndex` the id: `-1` means `404 note not found`; `DELETE` removes it with `splice` and answers `{ status: 204 }` with no body.
