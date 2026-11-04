from main import merge_layers, split_ends, swap_pairs

first, middle, last = split_ends(range(6))
print("ends:", first, middle, last)

defaults = {"theme": "dark", "retries": 3}
user = {"theme": "light"}
print("merged:", merge_layers(defaults, user, retries=5))
print("defaults untouched:", defaults)
print("swapped:", swap_pairs([("a", 1), ("b", 2)]))
