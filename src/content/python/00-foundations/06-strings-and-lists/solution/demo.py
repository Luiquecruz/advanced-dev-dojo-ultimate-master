from main import clean_words, highest, initials, last_items

print("initials:", initials("ada lovelace"))
print("last two:", last_items(["tea", "cake", "jam", "bread"], 2))
print("last none:", last_items(["tea", "cake"], 0))
print("words:", clean_words("Hello, world! ... Hello?"))

scores = [70, 95, 88, 60]
print("top two:", highest(scores, 2))
print("scores afterwards:", scores)
