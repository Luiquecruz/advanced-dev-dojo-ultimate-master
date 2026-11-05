PUNCTUATION = ".,!?;:"


def initials(full_name):
    # TODO: split the name into words and join the upper-cased first letters, each followed by a dot.
    return ""


def last_items(items, n):
    # TODO: this is wrong for one value of n; slice from where the last n items start.
    return items[-n:]


def clean_words(text):
    # TODO: lower-case, strip PUNCTUATION from both ends of each word, drop empty words.
    return text.split()


def highest(scores, n):
    # TODO: do not reorder the caller's list; sort a new one.
    scores.sort(reverse=True)
    return scores[:n]
