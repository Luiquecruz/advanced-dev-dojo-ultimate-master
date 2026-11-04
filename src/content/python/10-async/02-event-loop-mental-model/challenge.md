Write four small functions in `main.py` that show when a coroutine runs. Every function receives a `recorder` list and appends events to it; the tests read the order of those events.

## `fetch(name, recorder)`

An `async` function. It appends `"start:<name>"`, gives control back to the event loop **once** with `await asyncio.sleep(0)`, appends `"end:<name>"` and returns `"data:<name>"`.

## `run_sequential(names, recorder)`

An `async` function that awaits `fetch` for each name **one after the other** and returns the list of results in the order of `names`. For `["a", "b"]` the recorder ends as `["start:a", "end:a", "start:b", "end:b"]`.

## `run_concurrent(names, recorder)`

An `async` function that runs every `fetch` **at the same time** with `asyncio.create_task`, waits for all of them and returns the results in the order of `names`. For `["a", "b"]` the recorder ends as `["start:a", "start:b", "end:a", "end:b"]`. An empty list returns `[]`.

## `lazy_coroutine(recorder)`

A **plain** function (not `async`) that returns the coroutine `fetch("lazy", recorder)` without starting it: the recorder stays empty, even while other tasks run, until someone awaits the returned object.

The tests are `async` and await everything you return. Never call `asyncio.run` in `main.py`.
