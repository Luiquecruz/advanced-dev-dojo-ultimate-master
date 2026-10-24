1. Write the reducer as a `switch` on `action.type`, one case per event.
2. `added`: compute the next id from the current tasks, then return a spread copy with the new task appended.
3. `toggled`: `map` over the tasks, returning a new object for the matching id and the original object for the rest, so unchanged tasks keep their identity.
4. `deleted`: `filter` out the matching id.
5. `default`: throw an `Error` so misspelled action types fail loudly.
6. In the component, replace the TODOs with `dispatch` calls: handlers describe what happened, the reducer decides how state changes.
