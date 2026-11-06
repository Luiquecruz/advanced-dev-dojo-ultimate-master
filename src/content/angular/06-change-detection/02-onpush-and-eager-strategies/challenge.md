# External Progress Updates

Implement the `ProgressCard` component for a job reporter. External code calls `receiveProgress(value)` without clicking in the view. The displayed percentage must update after Angular stabilizes.

- Keep the displayed progress in a signal and derive the status as `Waiting` at 0, `Complete` at 100, and `Running` otherwise.
- Accept finite numbers, clamp them to 0–100 and ignore non-finite values.
- The Reset button returns the progress to 0.
- Preserve the `.percentage` and `.status` elements and the public method names.

Use Angular rendering notifications rather than forcing `detectChanges()` from the component.
