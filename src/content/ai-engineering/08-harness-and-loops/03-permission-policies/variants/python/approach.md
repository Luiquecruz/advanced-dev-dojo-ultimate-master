1. Separate matching from deciding. Two small pure functions answer "does this pattern match this string?", one for commands and one for paths, so the precedence logic never deals with wildcards.
2. Compile patterns to regular expressions matched with `re.fullmatch` and escape every literal character first; an unescaped `.` or `(` in a rule silently widens it.
3. Give paths glob semantics and normalize them with `posixpath.normpath` before matching. Normalization removes `./` and resolves `..`, which is exactly what defeats `src/../.env` against `Read(src/**)`; a path that still climbs out of the project is denied outright.
4. Decide with a fixed order: deny, then ask, then allow, first match wins, default ask. Return the rule that decided, because a decision you cannot explain is a decision you cannot debug.
5. Treat a compound shell command as several calls. Evaluate each part and keep the strictest result, so one denied part denies the whole line and an unknown part turns it into a question.
6. At the model boundary, fail closed: arguments that do not parse into a dict and tools the harness never offered are denied before any rule runs.
