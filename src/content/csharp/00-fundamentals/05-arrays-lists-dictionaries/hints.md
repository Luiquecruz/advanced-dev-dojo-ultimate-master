Start with `Stock.Restock`: a `for` loop gives you the index `i` and the level `levels[i]` at the same time. Add `i`, not the level, to the list, and compare with `<` so a level equal to the minimum is left out.

---

For `Cart.Total`, `foreach (var (sku, quantity) in lines)` splits each tuple into two variables. Look the price up with `prices.TryGetValue(sku, out decimal price)`: it returns `false` for a missing SKU instead of throwing, so you add to the total only when it returns `true`.

---

For `Words.Count`, walk the text one `char` at a time. Append letters, lowercased with `char.ToLowerInvariant`, to a `StringBuilder`. When you meet a non-letter and the builder is not empty, the word is complete: read the old count with `counts.TryGetValue(key, out int seen)` (it is `0` for a new word), store `seen + 1`, and `Clear()` the builder. Do the same once more after the loop, or the last word is lost.
