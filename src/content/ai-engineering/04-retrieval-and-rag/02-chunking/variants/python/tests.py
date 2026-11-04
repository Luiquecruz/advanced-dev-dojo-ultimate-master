import re

LETTERS = {"source": "letters.txt", "text": "abcdefghij" * 25}

FIRST_PARAGRAPH = "Annual plans can be refunded in full within 30 days of purchase."
SECOND_PARAGRAPH = "Monthly plans are not refunded, but you can cancel at any time."
PARAGRAPHS = {"source": "refunds.md", "text": f"{FIRST_PARAGRAPH}\n\n{SECOND_PARAGRAPH}\n"}

SENTENCES = {
    "source": "retention.md",
    "text": "Closed tickets are kept for 24 months. Admins can export tickets as CSV. Deleted tickets cannot be restored after 30 days. Exports include attachments.",
}

WORDS = {"source": "words.txt", "text": " ".join(f"word{index}" for index in range(70))}

MARKDOWN = {
    "source": "handbook.md",
    "text": """Brightdesk is a helpdesk for small teams.

# Billing

Brightdesk bills per agent seat.

## Refunds

Annual plans can be refunded within 30 days.

### Refund requests

Open a ticket from the account owner's email address.

## Plans

Starter, Growth and Scale.

# Security

## Single sign-on

Single sign-on with SAML is available on the Scale plan. Admins configure it under Settings. Once enforced, password login is disabled for every agent. The account owner keeps a recovery login for emergencies.
""",
}


def assert_faithful_offsets(document, chunks):
    for index, chunk in enumerate(chunks):
        assert chunk["text"] == document["text"][chunk["start"]:chunk["end"]]
        assert chunk["source"] == document["source"]
        assert chunk["id"] == f"{document['source']}#{index}"


def assert_every_word_covered(document, chunks, ignored=(0, 0)):
    for index, character in enumerate(document["text"]):
        if character.isspace() or ignored[0] <= index < ignored[1]:
            continue
        covered = any(chunk["start"] <= index < chunk["end"] for chunk in chunks)
        assert covered, f"character {index} ({character!r}) is in no chunk"


@test("chunk_fixed cuts windows of size characters that step by size minus overlap, with exact offsets and the last window ending at the text end")
def _():
    chunks = mod.chunk_fixed(LETTERS, size=100, overlap=20)
    assert [(chunk["start"], chunk["end"]) for chunk in chunks] == [(0, 100), (80, 180), (160, 250)]
    assert_faithful_offsets(LETTERS, chunks)
    for chunk in chunks:
        assert chunk["headingPath"] == []
    assert len(mod.chunk_fixed({"source": "two.txt", "text": "x" * 200}, size=100, overlap=0)) == 2
    assert mod.chunk_fixed({"source": "empty.txt", "text": ""}, size=100, overlap=0) == []


@test("every chunker rejects an overlap that is negative or not smaller than the size")
async def _():
    for chunker in (mod.chunk_fixed, mod.chunk_recursive, mod.chunk_markdown):
        for overlap in (50, 80, -1):
            error = await capture_error(lambda: chunker(LETTERS, size=50, overlap=overlap))
            assert isinstance(error, ValueError)


@test("chunk_recursive keeps paragraphs whole when they fit, then falls back to sentences, never cutting a sentence that fits")
def _():
    paragraphs = mod.chunk_recursive(PARAGRAPHS, size=80, overlap=0)
    assert [chunk["text"] for chunk in paragraphs] == [FIRST_PARAGRAPH, SECOND_PARAGRAPH]
    assert_faithful_offsets(PARAGRAPHS, paragraphs)
    sentences = mod.chunk_recursive(SENTENCES, size=80, overlap=0)
    assert len(sentences) > 1
    for chunk in sentences:
        assert len(chunk["text"]) <= 80
        assert chunk["text"].endswith(".")
    assert_faithful_offsets(SENTENCES, sentences)
    assert_every_word_covered(SENTENCES, sentences)


@test("chunk_recursive never splits a word when a separator exists and overlaps neighbors by at most overlap characters")
def _():
    text = WORDS["text"]
    chunks = mod.chunk_recursive(WORDS, size=50, overlap=15)
    assert len(chunks) > 5
    assert_faithful_offsets(WORDS, chunks)
    assert_every_word_covered(WORDS, chunks)
    for index, chunk in enumerate(chunks):
        assert len(chunk["text"]) <= 50
        assert chunk["start"] == 0 or text[chunk["start"] - 1] == " "
        assert chunk["end"] == len(text) or text[chunk["end"]] == " "
        if index > 0:
            shared = chunks[index - 1]["end"] - chunk["start"]
            assert 0 < shared <= 15
    separate = mod.chunk_recursive(WORDS, size=50, overlap=0)
    for previous, chunk in zip(separate, separate[1:]):
        assert chunk["start"] >= previous["end"]


@test("chunk_recursive hard-cuts a single word longer than the size and still covers all the text")
def _():
    document = {"source": "token.txt", "text": f"start {'z' * 230} end"}
    chunks = mod.chunk_recursive(document, size=100, overlap=0)
    for chunk in chunks:
        assert len(chunk["text"]) <= 100
    assert_faithful_offsets(document, chunks)
    assert_every_word_covered(document, chunks)


@test("chunk_markdown gives every chunk the path of headings above it and never lets a chunk cross a section boundary")
def _():
    chunks = mod.chunk_markdown(MARKDOWN, size=120, overlap=0)
    assert_faithful_offsets(MARKDOWN, chunks)
    paths = [" > ".join(chunk["headingPath"]) for chunk in chunks]
    distinct_paths = [path for index, path in enumerate(paths) if index == 0 or path != paths[index - 1]]
    assert distinct_paths == [
        "",
        "Billing",
        "Billing > Refunds",
        "Billing > Refunds > Refund requests",
        "Billing > Plans",
        "Security > Single sign-on",
    ]
    for chunk in chunks:
        heading_lines = re.findall(r"^#{1,6} ", chunk["text"], re.MULTILINE)
        assert len(heading_lines) <= 1
        if len(heading_lines) == 1:
            assert chunk["text"].startswith(heading_lines[0])
    assert not any(chunk["text"].strip() == "# Security" for chunk in chunks)


@test("chunk_markdown splits a long section recursively within the size and keeps its heading path on every piece")
def _():
    chunks = mod.chunk_markdown(MARKDOWN, size=120, overlap=30)
    sign_on = [chunk for chunk in chunks if " > ".join(chunk["headingPath"]) == "Security > Single sign-on"]
    assert len(sign_on) > 1
    for chunk in chunks:
        assert len(chunk["text"]) <= 120
    assert_faithful_offsets(MARKDOWN, chunks)
    empty_section = MARKDOWN["text"].index("# Security")
    assert_every_word_covered(MARKDOWN, chunks, (empty_section, empty_section + len("# Security")))
    assert len({chunk["id"] for chunk in chunks}) == len(chunks)
