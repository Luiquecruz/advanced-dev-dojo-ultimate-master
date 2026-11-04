import copy

from main import clone_config, diff_shared, with_defaults

config = {"name": "api", "db": {"port": 5432}, "tags": ["blue"]}

shallow = dict(config)
print("shared after a shallow copy:", diff_shared(config, shallow))

clone = clone_config(config, name="worker")
clone["db"]["port"] = 6000
print("original port untouched:", config["db"]["port"])
print("shared after clone_config:", diff_shared(config, clone))

defaults = {"tags": [], "retries": 3}
merged = with_defaults({"name": "api"}, defaults)
merged["tags"].append("green")
print("defaults untouched:", defaults["tags"] == [])
print("deepcopy shares nothing:", diff_shared(config, copy.deepcopy(config)) == [])
