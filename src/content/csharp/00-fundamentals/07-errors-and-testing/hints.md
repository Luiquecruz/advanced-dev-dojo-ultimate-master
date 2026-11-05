Start with `Safe.Divide`: a guard clause `if (b == 0)` returns `(false, 0)` before the division can throw `DivideByZeroException`; after it, return `(true, a / b)`.

---

For `Ages.Parse`, call `int.TryParse(text, out int age)`. When it returns `false`, `throw new ArgumentException(...)`; `int.Parse` would throw `FormatException` instead, which the tests do not accept. Only after that check, test the range with `age < 0 || age > 150` and throw `ArgumentOutOfRangeException`. TryParse already accepts surrounding spaces.

---

`CountAdults` fails with `IndexOutOfRangeException`, and the stack trace that **Run** prints names `Ages.CountAdults`. Look at the loop condition: on its last pass `i` equals `ages.Length`, one past the last valid index. One character fixes it.
