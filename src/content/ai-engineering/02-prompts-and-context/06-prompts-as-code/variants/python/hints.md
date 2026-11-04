One compiled pattern does most of the work: `re.compile(r"\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}")`. `template_variables` collects `pattern.findall(...)` on both templates and removes duplicates in order with `list(dict.fromkeys(names))`. Rendering with `pattern.sub(lambda match: variables[match.group(1)], text)` is single-pass by construction.
---
Store versions in a dict of dicts, `self.prompts[name][version] = definition` (dicts keep insertion order for `versions`). For activations, keep a history list per `(name, environment)` key: the active version is the last element, promotion appends, rollback pops when at least two entries remain.
---
`run_tests` loops over the tests with `try`/`except Exception` around the model call, appending each name to `"passed"` or `"failed"`. `promote` checks for an empty test list first, then awaits `run_tests` and raises `PromotionBlockedError(report["failed"], ...)` when anything failed, before touching the history.
