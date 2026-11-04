1. For `split_ends`, ask what a single assignment with a starred target gives you for free (any iterable, a list in the middle, an error when too short).
2. For `merge_layers`, start from an empty dict so no input is modified, merge the layers in order, then apply the overrides.
3. For `swap_pairs`, unpack each pair in a comprehension instead of using indexes.
4. Run the tests with a tuple, a generator and a one-element list to see the three behaviors.
