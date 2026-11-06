Split `handle` by path first: `/notes` (the collection), `/notes/<id>` (one note, match it with `re.compile(r"^/notes/(\d+)$")`) and everything else (`404 not found`). Inside each branch, decide by method.
---
In the collection branch, `GET` lists and `POST` creates; any other method is `405`. Before creating, check `isinstance(text, str) and text.strip()` and answer `400` otherwise. `request.get("body")` may be missing.
---
In the note branch, reject methods other than `GET` and `DELETE` with `405` before looking the note up. Then find the note's position in the list: none means `404 note not found`; `DELETE` removes it with `del` and answers `{"status": 204}` with no `"body"` key.
