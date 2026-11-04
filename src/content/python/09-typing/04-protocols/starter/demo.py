from main import Badge, Closeable, Renderable, close_all, render_all


class SalesChart:
    """Written by another team: no shared base class."""

    def render(self) -> str:
        return "chart: 12 sales"


class Database:
    def __init__(self, name: str) -> None:
        self.name = name

    def close(self) -> None:
        print(f"closed {self.name}")


widgets = [Badge("beta"), SalesChart(), "plain text", 42]
print("rendered:", render_all(widgets))
print("SalesChart is Renderable:", isinstance(SalesChart(), Renderable))
print("Badge inherits Renderable:", Renderable in Badge.__mro__)

resources = [Database("orders"), Badge("not closeable"), Database("cache")]
print("closed:", close_all(resources))
print("Database is Closeable:", isinstance(Database("x"), Closeable))
