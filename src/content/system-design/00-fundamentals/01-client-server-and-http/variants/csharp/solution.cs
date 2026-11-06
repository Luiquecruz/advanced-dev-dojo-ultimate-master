using System.Text.RegularExpressions;

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
    private static readonly Regex NotePath = new(@"^/notes/(\d+)$");
    private static readonly HttpResponse MethodNotAllowed = new(405, new ErrorBody("method not allowed"));
    private static readonly HttpResponse NoteNotFound = new(404, new ErrorBody("note not found"));

    private readonly List<Note> _notes = [];
    private int _nextId = 1;

    public HttpResponse Handle(HttpRequest request)
    {
        if (request.Path == "/notes")
        {
            return HandleCollection(request);
        }
        var match = NotePath.Match(request.Path);
        if (match.Success)
        {
            return HandleNote(request, int.TryParse(match.Groups[1].Value, out var id) ? id : -1);
        }
        return new HttpResponse(404, new ErrorBody("not found"));
    }

    private HttpResponse HandleCollection(HttpRequest request)
    {
        if (request.Method == "GET")
        {
            return new HttpResponse(200, _notes.ToList());
        }
        if (request.Method != "POST")
        {
            return MethodNotAllowed;
        }
        if (request.Body?.GetValueOrDefault("text") is not string text || string.IsNullOrWhiteSpace(text))
        {
            return new HttpResponse(400, new ErrorBody("text is required"));
        }
        var note = new Note(_nextId++, text);
        _notes.Add(note);
        return new HttpResponse(201, note);
    }

    private HttpResponse HandleNote(HttpRequest request, int id)
    {
        if (request.Method != "GET" && request.Method != "DELETE")
        {
            return MethodNotAllowed;
        }
        var index = _notes.FindIndex(note => note.Id == id);
        if (index == -1)
        {
            return NoteNotFound;
        }
        if (request.Method == "GET")
        {
            return new HttpResponse(200, _notes[index]);
        }
        _notes.RemoveAt(index);
        return new HttpResponse(204);
    }
}
