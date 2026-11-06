import re

METHOD_NOT_ALLOWED = {"status": 405, "body": {"error": "method not allowed"}}
NOTE_NOT_FOUND = {"status": 404, "body": {"error": "note not found"}}
NOTE_PATH = re.compile(r"^/notes/(\d+)$")


class NotesApi:
    def __init__(self):
        self._notes = []
        self._next_id = 1

    def handle(self, request):
        path = request["path"]
        if path == "/notes":
            return self._handle_collection(request)
        match = NOTE_PATH.match(path)
        if match:
            return self._handle_note(request, int(match.group(1)))
        return {"status": 404, "body": {"error": "not found"}}

    def _handle_collection(self, request):
        method = request["method"]
        if method == "GET":
            return {"status": 200, "body": list(self._notes)}
        if method != "POST":
            return METHOD_NOT_ALLOWED
        body = request.get("body")
        text = body.get("text") if isinstance(body, dict) else None
        if not isinstance(text, str) or not text.strip():
            return {"status": 400, "body": {"error": "text is required"}}
        note = {"id": self._next_id, "text": text}
        self._next_id += 1
        self._notes.append(note)
        return {"status": 201, "body": note}

    def _handle_note(self, request, note_id):
        method = request["method"]
        if method not in ("GET", "DELETE"):
            return METHOD_NOT_ALLOWED
        index = next((position for position, note in enumerate(self._notes) if note["id"] == note_id), None)
        if index is None:
            return NOTE_NOT_FOUND
        if method == "GET":
            return {"status": 200, "body": self._notes[index]}
        del self._notes[index]
        return {"status": 204}


if __name__ == "__main__":
    api = NotesApi()
    print(api.handle({"method": "POST", "path": "/notes", "body": {"text": "Buy milk"}}))
    print(api.handle({"method": "GET", "path": "/notes/1"}))
    print(api.handle({"method": "PATCH", "path": "/notes"}))
