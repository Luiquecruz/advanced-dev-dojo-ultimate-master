// Top-level statements: Run executes these lines and prints the results; the tests ignore them.
var api = new NotesApi();
Console.WriteLine(api.Handle(new HttpRequest("POST", "/notes", new() { ["text"] = "Buy milk" })));
Console.WriteLine(api.Handle(new HttpRequest("GET", "/notes/1")));
Console.WriteLine(api.Handle(new HttpRequest("PATCH", "/notes")));

public record HttpRequest(string Method, string Path, Dictionary<string, object?>? Body = null);
public record HttpResponse(int Status, object? Body = null);
public record Note(int Id, string Text);
public record ErrorBody(string Error);

public class NotesApi
{
    private readonly List<Note> _notes = [];
    private int _nextId = 1;

    public HttpResponse Handle(HttpRequest request)
    {
        if (request.Path == "/notes" && request.Method == "GET")
        {
            return new HttpResponse(200, _notes.ToList());
        }
        if (request.Path == "/notes" && request.Method == "POST")
        {
            // TODO: validate text (400) and answer 201 with the created note
            var text = request.Body?.GetValueOrDefault("text") as string ?? "";
            var note = new Note(_nextId++, text);
            _notes.Add(note);
            return new HttpResponse(200, note);
        }
        // TODO: GET and DELETE /notes/<id> with 404 for a missing note
        // TODO: 405 for other methods on a known path, 404 for unknown paths
        return new HttpResponse(200, new ErrorBody("not found"));
    }
}
