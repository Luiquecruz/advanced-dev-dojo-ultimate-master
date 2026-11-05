from main import invert, top_words, unique_tags, word_counts

text = "the tea and the cake and the jam"
counts = word_counts(text)
print("counts:", counts)
print("top two:", top_words(counts, 2))
print("tags:", unique_tags([" Python", "python ", "", "Web"]))

phonebook = {"Ada": "555-0101", "Grace": "555-0102"}
print("by number:", invert(phonebook))
print("phone book afterwards:", phonebook)
