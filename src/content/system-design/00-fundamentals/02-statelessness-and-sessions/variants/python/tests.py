class Clock:
    def __init__(self):
        self.time = 0

    def now(self):
        return self.time


def setup(ttl_ms=1000):
    clock = Clock()
    store = mod.SessionStore(ttl_ms=ttl_ms, now=clock.now)
    return mod.Server("a", store), mod.Server("b", store), store, clock


@test("login returns a new session id, and asking who is logged in answers 200 with the user, or 401 for an unknown id")
def _():
    server_a, *_ = setup()
    ada = server_a.login("ada")
    alan = server_a.login("alan")
    assert isinstance(ada, str)
    assert ada != alan
    answers = [server_a.who_am_i(ada), server_a.who_am_i(alan), server_a.who_am_i("no-such-session")]
    assert answers == [
        {"status": 200, "body": {"user": "ada", "server": "a"}},
        {"status": 200, "body": {"user": "alan", "server": "a"}},
        {"status": 401, "body": {"error": "not logged in"}},
    ]


# beginner mistake: keeping the session in one server's memory instead of the shared store
@test("a session created on one server is recognized by another server that shares the store")
def _():
    server_a, server_b, *_ = setup()
    session_id = server_a.login("ada")
    answer = server_b.who_am_i(session_id)
    assert answer == {"status": 200, "body": {"user": "ada", "server": "b"}}
    other_session_id = server_b.login("grace")
    assert other_session_id != session_id


@test("a session expires exactly one TTL after login")
def _():
    server_a, server_b, store, clock = setup(ttl_ms=1000)
    clock.time = 5000
    session_id = server_a.login("ada")
    clock.time = 5999
    before_expiry = server_b.who_am_i(session_id)
    assert before_expiry["status"] == 200
    clock.time = 6000
    after_expiry = server_b.who_am_i(session_id)
    assert after_expiry == {"status": 401, "body": {"error": "not logged in"}}
    user = store.get(session_id)
    assert user is None


@test("logout on one server answers 204 and ends the session on every server")
def _():
    server_a, server_b, *_ = setup()
    ada = server_a.login("ada")
    alan = server_a.login("alan")
    answer = server_b.logout(ada)
    assert answer == {"status": 204}
    statuses = {"ada on a": server_a.who_am_i(ada)["status"], "ada on b": server_b.who_am_i(ada)["status"], "alan on b": server_b.who_am_i(alan)["status"]}
    assert statuses == {"ada on a": 401, "ada on b": 401, "alan on b": 200}
