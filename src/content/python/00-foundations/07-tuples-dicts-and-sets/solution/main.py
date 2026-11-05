def word_counts(text):
    counts = {}
    for word in text.lower().split():
        counts[word] = counts.get(word, 0) + 1
    return counts


def top_words(counts, n):
    ranked = sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))
    return ranked[:n]


def unique_tags(tags):
    cleaned = {tag.strip().lower() for tag in tags}
    cleaned.discard("")
    return sorted(cleaned)


def invert(phonebook):
    return {number: name for name, number in phonebook.items()}
