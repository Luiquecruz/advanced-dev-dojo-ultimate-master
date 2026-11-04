1. Fix the contract of a hook before writing the runner: what it receives, the few actions it may return, and what happens on each. A closed set of actions is what makes "anything else is a failure" possible.
2. Make the pipeline explicit and ordered: pre-tool hooks in order with rewrites flowing forward, one execution, post-tool hooks in order with the output flowing forward. Order is how redaction gets to run before audit.
3. Stop at the first block. Later hooks and the tool never run, and the result names the hook and its reason so both the model and the developer know what happened.
4. Wrap every hook in one guard that turns exceptions, timeouts (`asyncio.wait_for`) and invalid results into a block. Enforcement code that fails open is worse than no enforcement, because everyone believes it works.
5. Keep tool exceptions out of that guard: a failing tool is the tool's problem, not a policy decision.
6. At the model boundary, parse arguments defensively and translate every outcome into a tool message, so blocked calls become information the agent can act on.
