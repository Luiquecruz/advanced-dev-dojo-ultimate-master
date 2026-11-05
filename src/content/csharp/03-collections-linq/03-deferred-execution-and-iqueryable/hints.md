Ask of each method: should the work happen now, or when the caller loops? `InStock` and `FirstExpensive` must read as little as possible; `Summarize` and `ParseQuantities` must do all their reading at the call.

---

`InStock` is a plain `Where` with nothing after it: `ToList()` would read the whole source at the call. `FirstOrDefault(product => product.Price >= minimumPrice)` stops at the first match and returns `null` when nothing matches.

---

In `Summarize`, every `Count()` and `Sum()` on the parameter runs the source again. Call `ToList()` once and compute the three numbers from the list. In `ParseQuantities`, `Select` alone is deferred, so `int.Parse` runs only when the caller loops: end the query with `ToList()` so a bad line throws inside the call.
