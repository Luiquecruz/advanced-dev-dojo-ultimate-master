1. Turn the interface into a `type` alias with four object members, each with a literal `status` and only the fields that state needs.
2. Notice the new compile errors in `renderState`: the old code assumed every field might exist.
3. Switch on `state.status` and return the text for each of the four cases.
4. Remove every `!`: the narrowed member type guarantees that `data` and `error` exist where they are read.
