# Testing with unittest and unittest.mock

`unittest` ships with every Python. A test is a method whose name starts with `test` on a `unittest.TestCase` subclass; assertions are methods of the case, so failures report both values:

```py
import io
import unittest


def slugify(title):
    if not title.strip():
        raise ValueError("title is empty")
    return "-".join(title.lower().split())


class SlugTests(unittest.TestCase):
    def setUp(self):                       # runs before every test method
        self.titles = {"Hello World": "hello-world", "  Spaces  ": "spaces"}

    def test_table(self):
        for title, expected in self.titles.items():
            with self.subTest(title=title):  # each row reports on its own and the loop continues
                self.assertEqual(slugify(title), expected)

    def test_rejects_empty(self):
        with self.assertRaises(ValueError) as caught:
            slugify("")
        self.assertIn("empty", str(caught.exception))


suite = unittest.TestLoader().loadTestsFromTestCase(SlugTests)
result = unittest.TextTestRunner(stream=io.StringIO()).run(suite)
print(result.testsRun, result.failures, result.errors, result.wasSuccessful())
```

`python -m unittest` discovers `test*.py` files from the command line; `TestLoader` plus `TextTestRunner` does the same from code and returns a `TestResult` you can inspect.

## How it works

- **`patch(target)`** imports the module named in the target string, replaces one attribute with a `MagicMock` for the duration of the `with` block (or the decorated test) and restores the original afterwards, even on failure. `patch.object(obj, "name")` does the same on an object you already hold.
- **A `Mock` records every call.** `return_value` fixes the result; `side_effect` raises an exception, returns successive values from an iterable, or calls a function. `assert_called_once_with`, `assert_not_called` and `call_args_list` check how it was used. `autospec=True` makes the mock reject calls that the real signature would reject.
- **Fixtures and cleanup.** `setUp`/`tearDown` run around each test, `setUpClass` once per class, and `addCleanup` (or `enterContext`, 3.11) registers cleanup that runs even when `setUp` fails halfway.
- **A suite is as good as the bugs it catches.** Mutation testing plants small bugs (`>=` to `>`, a removed check) and expects the suite to fail. That is how this challenge grades you: boundary rows and exact arguments matter more than the number of tests.

**pytest** runs the same `TestCase` classes and adds a different style: plain `assert` with rewritten failure messages (the dojo's own `@test` harness imitates it), fixtures injected by parameter name, `@pytest.mark.parametrize` instead of `subTest` loops, and the `monkeypatch` fixture next to `unittest.mock`. It is not installed in this sandbox, so the challenge uses the standard library.

**Tests and secrets.** A test must never call a real service or read real credentials: patch the client, inject fake settings, and run a dependency audit such as `pip-audit` in CI next to the suite.

> **Status as of November 2026:** `unittest` and `unittest.mock` are in the standard library of every supported CPython; pytest 9.2.0 (October 2026) and pip-audit 2.10 are the current releases on PyPI.

## Common mistakes

**Patching where the function is defined.** `pricing.py` does `from rates import fetch_rate`, which copies the reference into `pricing`'s namespace at import time. `mock.patch("rates.fetch_rate")` replaces the attribute on `rates`, but `quote` looks up `pricing.fetch_rate` and still calls the real service:

```py
# wrong: rates.fetch_rate is replaced, nobody in pricing reads it
with mock.patch("rates.fetch_rate", return_value=0.5):
    pricing.quote(250, 4, currency="EUR")       # ConnectionError from the real service

# right: patch the name where it is looked up
with mock.patch("pricing.fetch_rate", return_value=0.5) as fetch_rate:
    assert pricing.quote(250, 4, currency="EUR") == 500
fetch_rate.assert_called_once_with("EUR")
```

The rule flips when the code does `import rates` and calls `rates.fetch_rate(...)`: then `rates.fetch_rate` is the name it looks up.

## When to choose it

- **`unittest`** when you cannot add dependencies (stdlib-only tools, this sandbox), or a codebase already uses `TestCase` classes.
- **pytest** for most new projects: less boilerplate, better failure output, a large plugin ecosystem, and it still runs your `unittest` tests.
- **`mock.patch`** at boundaries you do not own (network, clock, randomness), always on the name where the code under test looks it up. Avoid mocking your own pure functions: test them directly.
