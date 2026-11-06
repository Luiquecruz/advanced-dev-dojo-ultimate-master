using Dojo;

public static class NotesApiTests
{
    private static HttpRequest Post(string path, Dictionary<string, object?>? body) => new("POST", path, body);

    [Test("POST /notes answers 201 with the created note and GET /notes lists notes in order")]
    public static void CreatesAndLists()
    {
        var api = new NotesApi();
        Assert.Equal(new HttpResponse(201, new Note(1, "Buy milk")), api.Handle(Post("/notes", new() { ["text"] = "Buy milk" })));
        api.Handle(Post("/notes", new() { ["text"] = "Call Ada" }));
        var listed = api.Handle(new HttpRequest("GET", "/notes"));
        Assert.Equal(200, listed.Status);
        Assert.SequenceEqual([new Note(1, "Buy milk"), new Note(2, "Call Ada")], listed.Body as IEnumerable<Note>);
    }

    // beginner mistake: reporting an error as 200 with an error field instead of a 4xx status
    [Test("POST /notes without a usable text answers 400 and creates nothing")]
    public static void RejectsMissingText()
    {
        var api = new NotesApi();
        Dictionary<string, object?>?[] bodies = [null, new(), new() { ["text"] = 42 }, new() { ["text"] = "   " }];
        foreach (var body in bodies)
        {
            Assert.Equal(new HttpResponse(400, new ErrorBody("text is required")), api.Handle(Post("/notes", body)));
        }
        Assert.SequenceEqual([], api.Handle(new HttpRequest("GET", "/notes")).Body as IEnumerable<Note>);
    }

    [Test("GET and DELETE /notes/<id> find the note or answer 404")]
    public static void FindsAndDeletes()
    {
        var api = new NotesApi();
        api.Handle(Post("/notes", new() { ["text"] = "Buy milk" }));
        Assert.Equal(new HttpResponse(200, new Note(1, "Buy milk")), api.Handle(new HttpRequest("GET", "/notes/1")));
        Assert.Equal(new HttpResponse(404, new ErrorBody("note not found")), api.Handle(new HttpRequest("GET", "/notes/9")));
        Assert.Equal(new HttpResponse(204), api.Handle(new HttpRequest("DELETE", "/notes/1")));
        Assert.Equal(new HttpResponse(404, new ErrorBody("note not found")), api.Handle(new HttpRequest("DELETE", "/notes/1")));
    }

    [Test("a known path with the wrong method answers 405 and an unknown path 404")]
    public static void RejectsWrongMethodsAndPaths()
    {
        var api = new NotesApi();
        api.Handle(Post("/notes", new() { ["text"] = "Buy milk" }));
        Assert.Equal(new HttpResponse(405, new ErrorBody("method not allowed")), api.Handle(new HttpRequest("DELETE", "/notes")));
        Assert.Equal(new HttpResponse(405, new ErrorBody("method not allowed")), api.Handle(new HttpRequest("PUT", "/notes/1")));
        Assert.Equal(new HttpResponse(404, new ErrorBody("not found")), api.Handle(new HttpRequest("GET", "/users")));
    }
}
