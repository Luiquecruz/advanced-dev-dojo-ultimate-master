1. For each function, decide when it may read from its source: never at the call, and at each `next()` only as far as the item it is about to hand out.
2. Turn `read_blocks` into a generator: emit a block when a blank line closes it, start a fresh list, and handle the block still open when the input ends.
3. Trace `take(2, numbers)` twice on the same iterator over `range(10)`, writing down every item pulled. The second call must start at `2`; if it starts at `3`, one item was pulled and dropped.
4. Write `id_sequence` as an endless loop whose state lives in the generator's locals, and consume it only with bounded tools (`next`, `zip`, `islice`).
5. Confirm with `inspect.isgenerator` that all three return generators, then run the demo and count how many "reading" lines the noisy source prints.
