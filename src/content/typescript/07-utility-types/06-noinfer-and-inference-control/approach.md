1. Identify the inference source in each function (the list) and the positions that must only be checked.
2. Wrap those positions in `NoInfer<...>`.
3. Validate transitions at runtime and record them in the `visited` array.
4. Find the input among the allowed options and fall back when it is missing.
