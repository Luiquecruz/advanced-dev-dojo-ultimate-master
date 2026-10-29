1. Start with `formatSSE`: it is pure and shows exactly what goes over the wire. Multi-line data needs one `data:` line per line, and the blank line is what ends an event.
2. In the route, separate the two phases of a streaming response: everything that can change the status (the 404) happens first, then the stream begins and the status is fixed at 200.
3. Read `Last-Event-ID` once, before the stream, and default it to `-1` so a fresh connection receives every step.
4. Inside `streamSSE`, write one event per step with its index as the id, and wait through the injected function so tests stay instant and production can use a real timer.
5. Finish with the `done` event; returning from the callback closes the stream, which is how the client knows the job ended.
