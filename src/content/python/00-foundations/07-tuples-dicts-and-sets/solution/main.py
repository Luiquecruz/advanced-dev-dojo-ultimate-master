def word_counts(text):
    counts = {}
    for word in text.lower().split():
        counts[word] = counts.get(word, 0) + 1
    return counts


def top_words(counts, n):
    ranked = sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))
    return ranked[:n]


def unique_tags(tags):
    cleaned = set()
    for tag in tags:
        tag = tag.strip().lower()
        if tag:
            cleaned.add(tag)
    return sorted(cleaned)


def invert(phonebook):
    numbers = {}
    for name, number in phonebook.items():
        numbers[number] = name
    return numbers
