Three small jobs for a shop, each with the container from this lesson that fits it. Write the three static methods below.

## `Words.Count`

`static Dictionary<string, int> Count(string text)` returns how many times each word appears in `text`.

- A word is a run of letters (`char.IsLetter`). Every other character (spaces, commas, full stops, digits) separates words, so `"Stop! Look, listen."` has the words `stop`, `look` and `listen`.
- Case does not matter: `The` and `the` are the same word. The keys of the dictionary are lowercase (`char.ToLowerInvariant`).
- The last word counts too, even when the text does not end with punctuation.
- A text without letters returns an empty dictionary.

`Words.Count("The cat saw the other cat")` returns `the: 2`, `cat: 2`, `saw: 1`, `other: 1`.

## `Stock.Restock`

`static List<int> Restock(int[] levels, int minimum)` returns the **indexes** of every stock level that is below `minimum`, from first to last. A level equal to `minimum` is fine and is not restocked.

`Stock.Restock([5, 0, 12, 3], 4)` returns `[1, 3]`.

## `Cart.Total`

`static decimal Total((string Sku, int Quantity)[] lines, Dictionary<string, decimal> prices)` returns the sum of `quantity × price` over the lines.

- A line whose SKU has no entry in `prices` is skipped: it adds nothing, and `Total` does not throw.
- An empty cart totals `0`.

With prices `MUG: 9.50` and `PEN: 1.25`, the cart `[("MUG", 2), ("PEN", 4)]` totals `24.00`.

The lines at the top of the file are a small program: press **Run** to see what your methods return, and run the tests to grade them.
