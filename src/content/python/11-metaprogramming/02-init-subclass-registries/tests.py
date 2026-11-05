import abc


# beginner mistake: registering plugins in __init__, so the registry stays empty until an instance exists
@test("concrete subclasses register under their class keyword name or their class name")
def _():
    class CsvExport(mod.Plugin, name="csv"):
        pass

    class JsonExport(mod.Plugin):
        pass

    names = sorted(mod.Plugin.registry)
    csv_name = getattr(CsvExport, "plugin_name", None)
    json_name = getattr(JsonExport, "plugin_name", None)
    assert names == ["JsonExport", "csv"]
    assert mod.Plugin.registry["csv"] is CsvExport
    assert mod.Plugin.registry["JsonExport"] is JsonExport
    assert csv_name == "csv"
    assert json_name == "JsonExport"


@test("a duplicate plugin name raises ValueError and keeps the first class")
async def _():
    class First(mod.Plugin, name="report"):
        pass

    def define_duplicate():
        class Second(mod.Plugin, name="report"):
            pass

    error = await capture_error(define_duplicate)
    assert isinstance(error, ValueError)
    assert "report" in str(error)
    kept = mod.Plugin.registry.get("report")
    assert kept is First


@test("abstract plugins stay out of the registry and their subclasses register at any depth")
def _():
    class Exporter(mod.Plugin, abstract=True):
        pass

    class Csv(Exporter, name="csv"):
        pass

    class Tsv(Csv):
        pass

    class Archive(Exporter):
        pass

    names = sorted(mod.Plugin.registry)
    tsv_name = getattr(Tsv, "plugin_name", None)
    assert names == ["Archive", "Tsv", "csv"]
    assert mod.Plugin.registry["Tsv"] is Tsv
    assert tsv_name == "Tsv"


@test("class keywords that Plugin does not use reach the next class in the MRO")
def _():
    class Tagged:
        def __init_subclass__(cls, tags=(), **kwargs):
            super().__init_subclass__(**kwargs)
            cls.tags = tuple(tags)

    class CsvExport(mod.Plugin, Tagged, name="csv", tags=["export", "text"]):
        pass

    tags = getattr(CsvExport, "tags", None)
    assert tags == ("export", "text")
    assert mod.Plugin.registry["csv"] is CsvExport


@test("plugins can also inherit from abc.ABC and keep its abstract method checks")
async def _():
    class Exporter(mod.Plugin, abc.ABC, abstract=True):
        @abc.abstractmethod
        def export(self, rows): ...

    class Csv(Exporter, name="csv"):
        def export(self, rows):
            return ",".join(rows)

    result = mod.Plugin.registry["csv"]().export(["a", "b"])
    assert result == "a,b"
    error = await capture_error(lambda: Exporter())
    assert isinstance(error, TypeError)
