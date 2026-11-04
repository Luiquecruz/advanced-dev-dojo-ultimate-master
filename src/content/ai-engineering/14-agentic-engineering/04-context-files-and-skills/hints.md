`parseSkill` is line work: split on `\n`, check that line 0 is `---`, find the next `---` with `findIndex` starting after it, and read `key: value` pairs into a `Map`. The name rule fits one regular expression: `/^[a-z0-9]+(-[a-z0-9]+)*$/` plus a length check.
---
For `contextFilesFor`, compute the folder of each path (everything before the last `/`, or `''`). A file applies when its folder is `''`, equals the target's folder, or the target's folder starts with `folder + '/'`. Sort by the number of path segments.
---
In `buildAgentContext`, add up the always-on tokens first and throw before looking at skills. Then sort `{ skill, score }` pairs and walk them with a running `used` total, checking threshold, then the `maxSkills` limit, then the budget. `answerWithSkills` reuses the same `# Skill: <name>\n<body>` section and the same running total: keep `loaded` and `tokens` in variables the tool handler updates.
