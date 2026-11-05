For `Ages.Parse`, call `int.TryParse(text, out int age)`. When it returns `false`, `throw new ArgumentException(...)`; `int.Parse` would throw `FormatException` instead, which the tests do not accept. Only after that check, test the range with `age < 0 || age > 150` and throw `ArgumentOutOfRangeException`. TryParse already accepts surrounding spaces.

---

`CountAdults` fails with `IndexOutOfRangeException`; the test report shows that type and its message, and the stack trace that **Run** prints names `Ages.CountAdults`. Look at the loop condition: on its last pass `i` equals `ages.Length`, one past the last valid index. One character fixes it.

---

In `SignUpList`, write the name cleaning once, as a small `private static` method that returns `name.Trim().ToLowerInvariant()`, and use it in `Add` and `Find`. In `Add`, put the guard clauses first (`string.IsNullOrWhiteSpace(name)`, then `_ages.ContainsKey(key)`), and call `Ages.Parse` before you store anything, so a refused sign-up leaves the dictionary and `Count` as they were. `Find` is `TryGetValue` turned into a tuple.
