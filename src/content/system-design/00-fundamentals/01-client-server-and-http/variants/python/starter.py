class NotesApi:
    def __init__(self):
        self._notes = []
        self._next_id = 1

    def handle(self, request):
        method = request["method"]
        path = request["path"]
        if path == "/notes" and method == "GET":
            return {"status": 200, "body": list(self._notes)}
        if path == "/notes" and method == "POST":
            # TODO: validate text (400) and answer 201 with the created note
            text = (request.get("body") or {}).get("text", "")
            note = {"id": self._next_id, "text": text}
            self._next_id += 1
            self._notes.append(note)
            return {"status": 200, "body": note}
        # TODO: GET and DELETE /notes/<id> with 404 for a missing note
        # TODO: 405 for other methods on a known path, 404 for unknown paths
        return {"status": 200, "body": {"error": "not found"}}


if __name__ == "__main__":
    api = NotesApi()
    print(api.handle({"method": "POST", "path": "/notes", "body": {"text": "Buy milk"}}))
    print(api.handle({"method": "GET", "path": "/notes/1"}))
    print(api.handle({"method": "PATCH", "path": "/notes"}))
