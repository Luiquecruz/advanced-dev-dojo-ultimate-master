def word_counts(text):
    # TODO: count every word of text, ignoring case; a word seen for the first time must not raise KeyError.
    return {}


def top_words(counts, n):
    # TODO: sort the (word, count) pairs by count from high to low, then by word, and keep the first n.
    return list(counts.items())[:n]


def unique_tags(tags):
    # TODO: strip and lower-case each tag, drop blank ones, remove duplicates and sort.
    return tags


def invert(phonebook):
    # TODO: return a new dict that maps each number to its name.
    return phonebook
