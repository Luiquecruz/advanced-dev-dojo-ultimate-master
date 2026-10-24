1. Replace `private balance` with `#balance = 0` and rename every usage.
2. Mark `owner` as `readonly`; the constructor can still assign it.
3. Add guard clauses to `deposit` and `withdraw`, throwing before the balance changes.
4. Implement `transferTo` by calling `withdraw` first, so a failed withdrawal never credits the target, then increase `target.#balance`.
