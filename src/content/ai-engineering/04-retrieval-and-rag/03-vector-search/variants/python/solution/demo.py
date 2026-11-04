import json

from corpus import PASSAGES
from main import create_vector_index

index = create_vector_index()


def ask(query, *, top_k=3, filter=None, min_score=None):
    results = index.search(query, top_k=top_k, filter=filter, min_score=min_score)
    filter_label = f" filter {json.dumps(filter, separators=(',', ':'))}" if filter else ""
    print(f"\n\"{query}\"{filter_label}")
    if not results:
        print('  no passage above the threshold: answer "I could not find this in the handbook"')
    for result in results:
        print(f"  {result['score']:.3f}  {result['id']} ({result['metadata']['product']}, {result['metadata']['plan']})")


def main():
    index.add(PASSAGES)
    print(f"Indexed {index.count()} handbook passages")
    ask("How long do refunds take to reach my card?")
    ask("How do I enable single sign-on?", top_k=2, filter={"plan": ["scale"]})
    ask("zebra quantum banana", top_k=3)
    ask("zebra quantum banana", top_k=3, min_score=0.35)
    index.add([{"id": "billing-refund-timing", "text": "Refunds now reach the original card within 3 business days.", "metadata": {"product": "billing", "plan": "all", "updated": "2026-10-20"}}])
    print("\nUpdated billing-refund-timing (same id, new text, re-embedded)")
    ask("How long do refunds take to reach my card?", top_k=1)


if __name__ == "__main__":
    main()
