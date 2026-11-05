1. List the briefing's silent-loss risks one by one: per-line rounding, local times, the three consumers' types, the byte limit, partial files, mixed output streams, exit codes. Each maps to one or two plan fields.
2. Compute the drift per product, both ways, and look at which products differ. Then decide the money type from two facts: the drift is not zero, and one unit price is below a cent.
3. Count the distinct offsets with a set and write down why a naive local time cannot be placed in a UTC invoice month.
4. Decide the serialization from the consumers: which formats every consumer can read, Python or not, which one fails on an unknown type, and which one runs code while loading untrusted files.
5. Encode `SAMPLE_RECORD` exactly by the contract and measure bytes. Compute the batch ceiling from the request limit and the floor from the rate and the window, check that the floor is below the ceiling, and pick a batch between them.
6. Choose the file writes, logging and CLI from the shared folder, the redirected standard output and the scheduler's exit codes.
7. Write the ADR: the numbers in the context, the untrusted input named, a `We will` decision naming `Decimal`, UTC, the encoder and `argparse`, rejected alternatives with the fact that ruled each out, and positive, negative and security consequences. Re-read the coherence rules against every plan value.
