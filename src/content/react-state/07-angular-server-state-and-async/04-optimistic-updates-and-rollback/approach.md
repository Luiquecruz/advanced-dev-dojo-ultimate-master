1. Hold the list and the error in private signals and expose read-only views.
2. Write one `patch` helper that updates a single todo immutably.
3. In `toggle`, snapshot, patch, then save inside a `try`.
4. On failure, patch back only the previous `completed` value and set the error.
