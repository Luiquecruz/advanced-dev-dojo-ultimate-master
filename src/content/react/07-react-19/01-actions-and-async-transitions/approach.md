1. Call `useTransition()` to obtain `isPending` and `startTransition`.
2. In the click handler, pass an **async** function to `startTransition`; React keeps `isPending` true until it resolves.
3. Inside the Action, `await fetch` with `PATCH`, the JSON header and the stringified `{ title }` body.
4. Branch on `response.ok`: store the error message on failure, or parse the JSON and store the returned `title` on success. Wrap these post-`await` updates in a nested `startTransition`.
5. Render the button with `disabled={isPending}` and switch its label to `Saving...`; conditionally render the `status` and `alert` paragraphs.
