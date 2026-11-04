import copy


def make_config():
    return {"name": "api", "db": {"port": 5432}, "tags": ["a"]}


@test("clone_config isolates nested dicts and lists from the original")
def _():
    config = make_config()
    clone = mod.clone_config(config)
    clone["db"]["port"] = 1
    clone["tags"].append("b")
    assert config["db"]["port"] == 5432
    assert config["tags"] == ["a"]


@test("clone_config applies top-level overrides without touching the original")
def _():
    config = make_config()
    clone = mod.clone_config(config, name="worker")
    assert clone["name"] == "worker"
    assert config["name"] == "api"


@test("clone_config keeps a self-referencing configuration intact")
def _():
    config = make_config()
    config["self"] = config
    clone = mod.clone_config(config)
    assert clone is not config
    assert clone["self"] is clone


@test("with_defaults fills missing keys without sharing mutable defaults")
def _():
    defaults = {"tags": [], "retries": 3}
    result = mod.with_defaults({"name": "api"}, defaults)
    result["tags"].append("x")
    assert defaults["tags"] == []
    assert result["retries"] == 3
    assert result["name"] == "api"
    assert mod.with_defaults({"retries": 5}, defaults)["retries"] == 5


@test("diff_shared lists the containers a shallow copy still shares")
def _():
    config = make_config()
    shallow = dict(config)
    shared = mod.diff_shared(config, shallow)
    assert shared == ["db", "tags"]


@test("diff_shared is empty after a deep copy")
def _():
    config = make_config()
    shared = mod.diff_shared(config, copy.deepcopy(config))
    assert shared == []
