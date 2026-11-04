1. For each function, decide what may be shared with the caller (nothing mutable) and what may be returned as is.
2. `clone_config`: deep copy the input, then apply the overrides on the clone so the original is never touched.
3. `with_defaults`: start from a deep copy of the defaults, overlay a deep copy of the config values, and return the new dict.
4. `diff_shared`: iterate over the keys present in both dicts, compare with `is`, and keep only mutable containers.
5. Test your own helpers on a shallow copy (`dict(config)`) and on a deep copy to see the difference `diff_shared` reports.
