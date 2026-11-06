Write the request handler of a tiny notes API. There is no network here: a request is a plain record and the handler returns a plain record, which is exactly what a real server does after TCP and HTTP parsing are done.

```csharp
public record HttpRequest(string Method, string Path, Dictionary<string, object?>? Body = null);
public record HttpResponse(int Status, object? Body = null);
public record Note(int Id, string Text);
public record ErrorBody(string Error);

public class NotesApi
{
    public HttpResponse Handle(HttpRequest request);
}
```

Each `new NotesApi()` starts with an empty list of notes. Note ids start at `1` and grow by one.

| Request | Response |
| --- | --- |
| `GET /notes` | `200` with the list of notes (`IReadOnlyList<Note>`), in creation order |
| `POST /notes` with body `{ "text": … }` | `201` with the created `Note`. When `text` is missing, not a `string` or empty after trimming: `400` with `new ErrorBody("text is required")`, and no note is created |
| `GET /notes/<id>` | `200` with that `Note`, or `404` with `new ErrorBody("note not found")` |
| `DELETE /notes/<id>` | `204` with no body (`Body` is `null`), or `404` with `new ErrorBody("note not found")` |
| another method on `/notes` or `/notes/<id>` | `405` with `new ErrorBody("method not allowed")` |
| any other path | `404` with `new ErrorBody("not found")` |

Errors are always reported with their status code, never as `200` with an error in the body.
