from main import Plugin


class Exporter(Plugin, abstract=True):
    def export(self, rows):
        raise NotImplementedError


class CsvExport(Exporter, name="csv"):
    def export(self, rows):
        return "\n".join(",".join(row) for row in rows)


class MarkdownExport(Exporter, name="markdown"):
    def export(self, rows):
        header, *body = rows
        lines = ["| " + " | ".join(header) + " |", "|" + " --- |" * len(header)]
        lines += ["| " + " | ".join(row) + " |" for row in body]
        return "\n".join(lines)


print("registered before any instance:", sorted(Plugin.registry))

rows = [["sku", "qty"], ["A-1", "3"], ["B-2", "5"]]
for format_name in ("csv", "markdown"):
    print(f"--- {format_name}")
    print(Plugin.registry[format_name]().export(rows))

try:

    class AnotherCsv(Exporter, name="csv"):
        pass

except ValueError as error:
    print("rejected:", error)
