from main import ErrorCollector, Suppress, run_all

rows = ["12", "7", "seven", "", "40"]


def parse(text: str):
    def job() -> int:
        return int(text)

    return job


results, errors = run_all(parse(row) for row in rows)
print("imported:", results)
for error in errors:
    print("failed:", type(error).__name__)

cache = {"sku-1": 19.9}
with Suppress(KeyError):
    del cache["sku-2"]
print("cache after deleting a missing key:", cache)

collector = ErrorCollector(LookupError)
for key in ["sku-1", "sku-3"]:
    with collector:
        print(key, "->", cache[key])
print("missing keys:", [error.args[0] for error in collector.errors])
