import uuid


class SessionStore:
    def __init__(self, *, ttl_ms, now):
        self._ttl_ms = ttl_ms
        self._now = now
        self._sessions = {}

    def create(self, user):
        session_id = str(uuid.uuid4())
        self._sessions[session_id] = {"user": user, "expires_at": self._now() + self._ttl_ms}
        return session_id

    def get(self, session_id):
        record = self._sessions.get(session_id)
        if record is None:
            return None
        if self._now() >= record["expires_at"]:
            del self._sessions[session_id]
            return None
        return record["user"]

    def destroy(self, session_id):
        self._sessions.pop(session_id, None)


class Server:
    def __init__(self, name, store):
        self.name = name
        self._store = store

    def login(self, user):
        return self._store.create(user)

    def who_am_i(self, session_id):
        user = self._store.get(session_id)
        if user is None:
            return {"status": 401, "body": {"error": "not logged in"}}
        return {"status": 200, "body": {"user": user, "server": self.name}}

    def logout(self, session_id):
        self._store.destroy(session_id)
        return {"status": 204}


if __name__ == "__main__":
    clock = 0
    store = SessionStore(ttl_ms=1_000, now=lambda: clock)
    server_a = Server("a", store)
    server_b = Server("b", store)
    session_id = server_a.login("ada")
    print(server_b.who_am_i(session_id))
    clock = 1_000
    print(server_a.who_am_i(session_id))
