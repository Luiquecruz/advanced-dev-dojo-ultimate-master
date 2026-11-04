1. Start from the identity of a prompt: a name plus an immutable version. Rejecting a re-registration is what makes a version in a trace mean one exact text.
2. Derive the variable list from the template instead of declaring it twice; strict rendering then compares two sets and reports every difference at once, which turns typos into immediate, complete errors.
3. Substitute with one regular-expression `sub`, so user-provided values are never scanned for placeholders again.
4. Separate "registered" from "active": a new version ships dark, and activation is a per-environment history, so promotion is a push and rollback is a pop.
5. Gate promotion with the version's own tests, graded on properties of the reply. Any non-normal outcome (refusal, truncation, model error) is a failure, and an empty test list is a closed gate.
6. Keep the registry free of global state: everything lives in the `PromptRegistry` instance returned by `create_prompt_registry()`, so tests and environments cannot leak into each other.
