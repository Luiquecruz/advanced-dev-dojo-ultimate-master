1. Inject the storage token and define the defaults.
2. Write a guarded loader that handles version 1 (migrate), version 2 (validate) and everything else (defaults).
3. Initialize the signal from the loader.
4. Update the signal in the setters, clamp the font size and persist a version-2 envelope.
5. Guard the write in `persist()` with `try/catch` so a failing storage keeps the in-memory value.
