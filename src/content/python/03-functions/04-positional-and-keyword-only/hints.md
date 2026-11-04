The body of `connect` is already right. Only the signature changes: one `/` and one `*` in the parameter list.
---
`/` goes right after `host`; `*` goes right after `port=5432`. Everything after the `*` can only be passed by name.
---
`inspect.signature(function).parameters` is an ordered mapping of name to `Parameter`. Each `Parameter` has `.kind`, an enum member whose `.name` is the string the tests expect.
