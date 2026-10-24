1. Configure TestBed with the `component` parameter and create the fixture in `beforeEach`.
2. Await `whenStable()` so the first render is in the DOM before any case runs.
3. Add helpers to read the counter text and to find buttons by their label.
4. For each behavior, act (click), await `whenStable()`, then assert the visible text.
5. Think like a mutant: each case should fail if exactly one behavior breaks (initial value, increment, reset).
