1. Model the request as one state object so loading, error and data always change together and can never contradict each other.
2. In the effect, create an `AbortController` and reset the state to loading, so a URL change never shows the previous response.
3. Fetch with the controller's signal. Convert non-OK responses into thrown errors, because `fetch` only rejects on network failures.
4. Store success and failure results; skip `AbortError`, which only means the request was cancelled on purpose.
5. Return `() => controller.abort()` so React cancels the old request before running the effect for a new URL (and on unmount).
6. In `UserList`, branch on `isLoading`, then `error`, then render the list.
