The documented check needs no folder names and no environment variables: an interpreter started from an environment has a `sys.prefix` that differs from its `sys.base_prefix`. For commands, walk `path_dirs` in order and build each candidate path; the set `files` only answers "does this path exist?", it is never the thing you iterate.
---
A name with a `/` in it is not looked up at all, so test for that before the loop. An executable that exists in `files` but sits in a directory missing from `path_dirs` must not be found by its bare name, exactly like an unactivated `.venv/bin/pytest`.
---
`line.split("=")` breaks on the `command` line, which contains `--prompt="api"`; `str.partition("=")` splits at the first `=` only. Do not add a comment rule that `site` does not have: a `#` line with an `=` is a key like any other. Remember that `bool("false")` is `True`: compare the lowercased value with `"true"`. For the directory name, keep only the first two parts of `version.split(".")`.
