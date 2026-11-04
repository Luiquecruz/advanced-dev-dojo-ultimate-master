import json

from handbook import HANDBOOK
from main import chunk_fixed, chunk_markdown, chunk_recursive


def preview(text):
    return json.dumps(f"{text[:57]}..." if len(text) > 60 else text, ensure_ascii=False)


def show(title, chunks):
    print(f"\n{title}: {len(chunks)} chunks")
    for chunk in chunks[:4]:
        path = f" [{' > '.join(chunk['headingPath'])}]" if chunk["headingPath"] else ""
        print(f"  {chunk['id']} {chunk['start']}-{chunk['end']}{path} {preview(chunk['text'])}")


def main():
    show("Fixed windows (cut mid-word, no structure)", chunk_fixed(HANDBOOK, size=280, overlap=40))
    show("Recursive (paragraphs, then sentences, then words)", chunk_recursive(HANDBOOK, size=280, overlap=40))
    sections = chunk_markdown(HANDBOOK, size=280, overlap=40)
    show("Markdown-aware (sections with heading paths)", sections)
    question = "refund request"
    match = next(chunk for chunk in sections if question in " ".join(chunk["headingPath"]).lower())
    print(f"\nChunk a retriever would cite for \"{question}\": {match['id']} from {match['source']}, section \"{' > '.join(match['headingPath'])}\"")


if __name__ == "__main__":
    main()
