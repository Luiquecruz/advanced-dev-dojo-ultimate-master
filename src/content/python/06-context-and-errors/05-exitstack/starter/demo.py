from main import ResourcePool, open_all


class Channel:
    def __init__(self, name: str, broken: bool = False) -> None:
        self.name = name
        self.broken = broken

    def __enter__(self) -> str:
        if self.broken:
            raise ConnectionError(f"{self.name} unreachable")
        print("  open", self.name)
        return self.name

    def __exit__(self, *exc_info: object) -> bool:
        print("  close", self.name)
        return False


def openers(regions: list[str], broken: str | None = None):
    names = ["database", "broker", *[f"export-{region}" for region in regions]]
    return [lambda name=name: Channel(name, broken=name == broken) for name in names]


print("average run, 4 regions:")
with open_all(openers(["eu", "us", "br", "jp"])) as names:
    print("  capturing with", len(names), "resources")

print("a run where one export cannot open:")
try:
    with open_all(openers(["eu", "us", "br"], broken="export-us")):
        print("  never reached")
except ConnectionError as error:
    print("  failed:", error)

print("pool kept open between calls:")
pool = ResourcePool(openers(["eu"]))
print("  holding", pool.resources)
pool.close()
