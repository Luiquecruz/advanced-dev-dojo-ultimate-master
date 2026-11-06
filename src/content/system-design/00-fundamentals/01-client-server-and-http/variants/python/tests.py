@test("POST /notes answers 201 with the created note and GET /notes lists notes in order")
def _():
    api = mod.NotesApi()
    first = api.handle({"method": "POST", "path": "/notes", "body": {"text": "Buy milk"}})
    assert first == {"status": 201, "body": {"id": 1, "text": "Buy milk"}}
    api.handle({"method": "POST", "path": "/notes", "body": {"text": "Call Ada"}})
    listed = api.handle({"method": "GET", "path": "/notes"})
    assert listed == {"status": 200, "body": [{"id": 1, "text": "Buy milk"}, {"id": 2, "text": "Call Ada"}]}


# beginner mistake: reporting an error as 200 with an error field instead of a 4xx status
@test("POST /notes without a usable text answers 400 and creates nothing")
def _():
    api = mod.NotesApi()
    for request in [
        {"method": "POST", "path": "/notes"},
        {"method": "POST", "path": "/notes", "body": {}},
        {"method": "POST", "path": "/notes", "body": {"text": 42}},
        {"method": "POST", "path": "/notes", "body": {"text": "   "}},
    ]:
        response = api.handle(request)
        assert response == {"status": 400, "body": {"error": "text is required"}}
    assert api.handle({"method": "GET", "path": "/notes"})["body"] == []


@test("GET and DELETE /notes/<id> find the note or answer 404")
def _():
    api = mod.NotesApi()
    api.handle({"method": "POST", "path": "/notes", "body": {"text": "Buy milk"}})
    assert api.handle({"method": "GET", "path": "/notes/1"}) == {"status": 200, "body": {"id": 1, "text": "Buy milk"}}
    assert api.handle({"method": "GET", "path": "/notes/9"}) == {"status": 404, "body": {"error": "note not found"}}
    assert api.handle({"method": "DELETE", "path": "/notes/1"}) == {"status": 204}
    assert api.handle({"method": "DELETE", "path": "/notes/1"}) == {"status": 404, "body": {"error": "note not found"}}


@test("a known path with the wrong method answers 405 and an unknown path 404")
def _():
    api = mod.NotesApi()
    api.handle({"method": "POST", "path": "/notes", "body": {"text": "Buy milk"}})
    assert api.handle({"method": "DELETE", "path": "/notes"}) == {"status": 405, "body": {"error": "method not allowed"}}
    assert api.handle({"method": "PUT", "path": "/notes/1"}) == {"status": 405, "body": {"error": "method not allowed"}}
    assert api.handle({"method": "GET", "path": "/users"}) == {"status": 404, "body": {"error": "not found"}}
