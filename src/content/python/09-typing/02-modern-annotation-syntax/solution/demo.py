from typing import get_type_hints

from main import Node, apply_all, count_words, find_user, merge

for function in (count_words, find_user, apply_all, merge, Node.add):
    print(f"{function.__qualname__}: {get_type_hints(function)}")
print(f"Node: {get_type_hints(Node)}")

print(count_words(["ship", "ship", "pack"], limit=1))
print(find_user({7: "ada"}, 7), find_user({7: "ada"}, 8))
print(apply_all([1, 2, 3], lambda value: value * 10))
print(merge({"retries": 3}, {"retries": 5}, {"timeout": 30}))
print("chained:", Node("root").add(Node("a")).add(Node("b")).children[1].name)

print("not enforced:", count_words("banana"))
