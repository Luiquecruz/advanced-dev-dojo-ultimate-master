import asyncio

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from documents import DOCUMENTS, PEOPLE
from main import answer_question, create_secure_index

index = create_secure_index()
model = create_model()


def search_as(name, principal, query):
    results = index.search(principal, query, top_k=3, min_score=0.1)
    found = ", ".join(result["id"] for result in results) or "(nothing readable and relevant)"
    print(f"  {name.ljust(6)} ({principal['tenantId']}, {'+'.join(principal['groups'])}): {found}")


async def main():
    for document in DOCUMENTS:
        index.upsert(document)
    print(f"Indexed {index.count()} documents for 2 tenants\n")

    print('"salary bands for engineers"')
    for name, principal in PEOPLE.items():
        search_as(name, principal, "salary bands for engineers")

    print("\nHR revokes engineering access to the incident review")
    search_as("dana", PEOPLE["dana"], "October outage certificate")
    index.upsert({**DOCUMENTS[2], "allowedGroups": ["security"]})
    search_as("dana", PEOPLE["dana"], "October outage certificate")

    print("\nDana's review is deleted after the retention period")
    search_as("maria", PEOPLE["maria"], "performance review Dana raise")
    index.remove("acme-performance-review-dana")
    search_as("maria", PEOPLE["maria"], "performance review Dana raise")

    fake_model.handle(lambda request, context: respond.text("You get 25 days of paid leave a year, approved by your manager [1]."))
    answer = await answer_question(model, index, PEOPLE["sam"], "How many leave days do I get, and what are the salary bands?")
    print(f"\nSam asks about leave and salaries: {answer['answer']}")
    print(f"  sources sent to the model: {', '.join(answer['sourceIds'])}")
    prompt = "\n".join(message["content"] for message in fake_model.requests[0]["messages"])
    forbidden = [document for document in DOCUMENTS if document["id"] not in answer["sourceIds"] and document["text"] in prompt]
    print(f"  documents Sam cannot read that reached the prompt: {len(forbidden)}")


if __name__ == "__main__":
    asyncio.run(main())
