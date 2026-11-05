# Project P1: Console Catalog Importer

Build a .NET 10 console app that reads a CSV of products, validates every row without stopping at the first bad one, and prints a deterministic report computed with LINQ. It is the first of seven practice projects: you build it locally with the .NET 10 SDK, and later projects reuse its parser (P4 adds unit tests for it).

## Coming from PHP/Magento

You have probably written this as a Magento import script or a `bin/magento` command: `fopen` + `fgetcsv` in a loop, `is_numeric` checks, an `$errors[]` array and a summary at the end. The shape is the same here; three things differ:

- **Parsing is typed and explicit.** `decimal.TryParse` returns `false` instead of coercing `"12abc"` to `12` the way PHP's `(float)` cast does. The result is a `decimal`, the type for money; `double` is binary floating point and cannot represent `0.10` exactly.
- **Culture matters.** `decimal.TryParse(text, out var price)` uses the machine's current culture, and its default style (`NumberStyles.Number`) allows thousands separators. On a `pt-BR` machine `.` is the thousands separator, so `"19.90"` parses successfully as `1990`: the row passes validation with a price 100 times too high, which is worse than a rejected row. That is why the helper below passes an explicit style without `AllowThousands`. Pass `CultureInfo.InvariantCulture` to parse and to format, so the report is the same everywhere.
- **`File.ReadLines` streams.** It returns an `IEnumerable<string>` that reads lazily (lesson 03), like iterating `fgetcsv`, while `File.ReadAllLines` loads the whole file into an array first.

## Goal

`dotnet run -- products.csv` prints an import report: how many rows were valid and invalid, total units and stock value, the top 5 products by stock value, and every invalid row with its line number and reason. Bad rows never stop the import, and the same input always produces byte-for-byte the same output.

## Features

- **Input**: a CSV file with the header `sku,name,price,stock`, one product per line, a comma as separator and `.` as decimal point. No quoted fields in the base version.
- **Validation** of each data row, collecting a reason per failure:
  - exactly four fields;
  - a non-empty SKU, not seen before in the file (case-insensitive, with a `HashSet<string>` and `StringComparer.OrdinalIgnoreCase`);
  - a non-empty name;
  - `price` parses as a `decimal` with the invariant culture and is `>= 0`;
  - `stock` parses as an `int` and is `>= 0`.
- **Model**: a `record Product(string Sku, string Name, decimal Price, int Stock)` for valid rows and a `record InvalidRow(int LineNumber, string Reason)` for the rest.
- **Report** computed with LINQ over the valid products:
  - valid and invalid counts;
  - total units (`Sum` of stock) and total stock value (`Sum` of `Price * Stock`);
  - top 5 by stock value, descending, ties broken by SKU with ordinal comparison;
  - invalid rows in line order.
- **Output** formatted with `CultureInfo.InvariantCulture` and fixed decimals (`ToString("0.00", CultureInfo.InvariantCulture)`).
- **Exit codes**: `0` after a report (even with invalid rows), `1` with a usage message when the argument is missing or the file does not exist.

A parsing helper in this style keeps the rules readable:

```csharp
using System.Globalization;

static bool TryParsePrice(string text, out decimal price) =>
    decimal.TryParse(text, NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint,
        CultureInfo.InvariantCulture, out price)
    && price >= 0;
```

## Acceptance criteria

1. `dotnet build` finishes with no errors and no warnings (nullable reference types are on in the template; keep them on).
2. `dotnet run -- products.csv` on a file with 10 valid rows and 3 invalid rows prints `Valid: 10` and `Invalid: 3`, and exits with code `0` (`echo $?` prints `0`).
3. Each invalid row appears with its physical line number in the file (the header is line 1) and a reason, for example `line 7: price 'abc' is not a number`.
4. A row with a duplicate SKU (`a-1` after `A-1`) is reported as invalid, and the first occurrence is kept.
5. The top 5 list is sorted by stock value descending; two products with the same stock value appear in SKU order.
6. Running the command twice, and running it under another culture, produces identical output (`diff` shows nothing). On any OS, add a temporary `CultureInfo.CurrentCulture = new CultureInfo("pt-BR");` as the first statement of `Program.cs` (or behind a debug flag). On Linux you can instead set `LANG`/`LC_ALL` to `pt_BR.UTF-8`, which needs ICU installed and globalization-invariant mode off (`DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false`); on Windows and macOS the culture comes from the OS settings, so `LANG` proves nothing there.
7. `dotnet run` with no argument, or with a path that does not exist, prints a usage message and exits with code `1`; no stack trace is shown.
8. An empty file, or a file with only the header, prints a report with zero counts instead of throwing (remember that `Max` and `Average` throw on empty sequences).

## Suggested steps

1. `dotnet new console -n CatalogImporter`, then `cd CatalogImporter`. Create `products.csv` by hand with valid rows plus at least one row for each failure rule.
2. Read the argument from `args`, check `File.Exists`, and return `1` with a usage message on failure.
3. Read `File.ReadLines(path)` and attach line numbers with `Select((line, index) => (Line: line, Number: index + 1))`, then `Skip(1)` the header. Doing it in this order keeps the numbers equal to the file's lines.
4. Write a `TryParseRow` method that returns either a `Product` or an `InvalidRow`. Put it in its own public static class and keep it free of `Console` calls, so P4 can move it into `Catalog.Core` and unit test it.
5. Split the results into two lists in one pass. Materialize them with `ToList()`; the report enumerates them several times (lesson 03).
6. Compute the report with `Count`, `Sum`, `OrderByDescending(...).ThenBy(p => p.Sku, StringComparer.Ordinal).Take(5)`.
7. Print it with invariant formatting. Run the acceptance checks, including the culture and empty-file cases.

## Stretch goals

- Support quoted fields (`"Shoe, red"`) with a small state machine; the base `Split(',')` breaks on them. If you prefer a CSV library from NuGet, check its licence first (lesson 01/04).
- Add a category column and print a per-category summary with `GroupBy` or `CountBy`.
- Accept `--format json` and print the report with `System.Text.Json`.
- Generate a file with one million rows and confirm that memory stays flat while streaming, then compare with `File.ReadAllLines`.

## Where to get help

- Lessons of this track: 03/01 (collections, `HashSet<T>` and comparers), 03/02 (LINQ operators and the empty-sequence rules), 03/03 (streaming and multiple enumeration), 02/01 (value and reference types), 02/02 (nullable reference types) and 01/02 (`dotnet new`, `dotnet run`).
- Microsoft docs: `File.ReadLines`, `decimal.TryParse` with `NumberStyles` and `IFormatProvider`, and the `dotnet run` command, linked in the resources.
- balta.io: Fundamentos do C# (.NET Core 3.1): its hands-on console projects, strings and exceptions chapters cover the basics used here.

## Check yourself

1. Why must the line numbers be attached before `Skip(1)`, and what would the report show if you did it the other way round?
2. Which of your queries would throw on an empty file if you had not handled it, and why does `Sum` not?
3. What makes the output depend on the machine if you leave out `CultureInfo.InvariantCulture`, and which acceptance criterion catches it?
