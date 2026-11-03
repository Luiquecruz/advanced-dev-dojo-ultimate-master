`recordTrajectory` is a few lines: create a `steps` array, pass an `onEvent` that pushes a model step (copy the three usage fields, `cost` becomes `costUsd`) or a tool step (`name`, `parseArguments(call.arguments)`, `ok`), then return the run's status and answer with the steps.
---
In `evaluateTrajectory`, first list the tool steps together with their index (`flatMap((step, index) => step.type === 'tool' ? [{ ...step, index }] : [])`), and compute the metrics in one pass. Then check the rules one by one, each pushing violations into the same array, so a trajectory with several problems reports all of them.
---
For an order pair, find the index of the first successful `before` call (use `Infinity` when there is none) and flag every `after` call with a smaller index. For forbidden calls, skip steps whose `arguments` are `null` before calling `matches`. Limits use a strict `>`. `evaluateSuite` maps the cases through `evaluateTrajectory` and counts `violation.rule` in an object.
