1. Notice that the starter's `loadDashboard` awaits each call before starting the next. Start every call first, then wait once.
2. Decide the failure policy before picking the combinator: required parts fail the whole result, optional parts get a fallback value, independent jobs get a report, redundant sources only need one success.
3. Make the optional call non-fatal at its own promise with `.catch`, so `Promise.all` keeps fail-fast behavior for the required ones.
4. For `sendAll`, `Promise.allSettled` keeps input order, so the index of each result points back to the channel name; split them by `status`.
5. For mirrors, `Promise.any` ignores rejections until all fail; translate its `AggregateError` into a domain error with a clear message.
6. For the deadline, race the work against a rejecting timer and clean up the timer in `finally`, whichever side wins.
