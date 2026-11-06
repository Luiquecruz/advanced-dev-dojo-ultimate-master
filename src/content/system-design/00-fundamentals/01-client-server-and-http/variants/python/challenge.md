Write the request handler of a tiny notes API. There is no network here: a request is a plain dict and the handler returns a plain dict, which is exactly what a real server does after TCP and HTTP parsing are done.

```python
request = {"method": "POST", "path": "/notes", "body": {"text": "Buy milk"}}  # "body" is optional
response = {"status": 201, "body": {"id": 1, "text": "Buy milk"}}            # "body" is absent for 204

class NotesApi:
    def handle(self, request: dict) -> dict: ...
```

Each `NotesApi()` starts with an empty list of notes. Note ids start at `1` and grow by one.

| Request | Response |
| --- | --- |
| `GET /notes` | `200` with the list of notes (`{"id", "text"}`), in creation order |
| `POST /notes` with body `{"text"}` | `201` with the created note. When `text` is missing, not a string or empty after stripping: `400` with `{"error": "text is required"}`, and no note is created |
| `GET /notes/<id>` | `200` with that note, or `404` with `{"error": "note not found"}` |
| `DELETE /notes/<id>` | `{"status": 204}` with no `"body"` key, or `404` with `{"error": "note not found"}` |
| another method on `/notes` or `/notes/<id>` | `405` with `{"error": "method not allowed"}` |
| any other path | `404` with `{"error": "not found"}` |

Errors are always reported with their status code, never as `200` with an error in the body.
