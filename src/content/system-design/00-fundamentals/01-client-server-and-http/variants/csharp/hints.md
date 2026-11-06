Split `Handle` by path first: `/notes` (the collection), `/notes/<id>` (one note, match it with the regular expression `^/notes/(\d+)$`) and everything else (`404 not found`). Inside each branch, decide by method.
---
In the collection branch, `GET` lists and `POST` creates; any other method is `405`. Before creating, check `request.Body?.GetValueOrDefault("text") is string text && !string.IsNullOrWhiteSpace(text)` and answer `400` otherwise. The body itself may be `null`.
---
In the note branch, reject methods other than `GET` and `DELETE` with `405` before looking the note up. Then `FindIndex` the id: `-1` means `404 note not found`; `DELETE` removes it with `RemoveAt` and answers `new HttpResponse(204)` with no body.
