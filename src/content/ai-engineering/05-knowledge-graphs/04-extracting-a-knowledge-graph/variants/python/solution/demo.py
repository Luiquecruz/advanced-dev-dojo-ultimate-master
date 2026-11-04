import asyncio

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import build_knowledge_graph

ONTOLOGY = {
    "classes": ["Person", "Organization", "Product"],
    "relations": [
        {"name": "worksFor", "domain": "Person", "range": "Organization"},
        {"name": "makes", "domain": "Organization", "range": "Product"},
        {"name": "acquired", "domain": "Organization", "range": "Organization"},
    ],
}

DOCUMENTS = [
    {"id": "memo-1", "text": "Ana Souza leads research at Acme Corp. Acme makes the Roadrunner drone."},
    {"id": "press-2", "text": "ACME Corporation acquired Globex Inc. and opened an office in Berlin."},
    {"id": "blog-3", "text": "Ána Souza, from Acme, presented the Roadrunner 2 at a conference in Lisbon."},
    {"id": "hr-4", "text": "Salary bands for every Acme employee."},
]


async def main():
    fake_model.reply(
        respond.json({
            "entities": [
                {"name": "Ana Souza", "type": "Person"},
                {"name": "Acme Corp", "type": "Organization", "aliases": ["Acme"]},
                {"name": "Roadrunner", "type": "Product"},
            ],
            "relations": [
                {"source": "Ana Souza", "type": "worksFor", "target": "Acme Corp"},
                {"source": "Acme", "type": "makes", "target": "Roadrunner"},
            ],
        }),
        respond.text("{'entities': [{'name': 'ACME Corporation'}"),
        respond.json({
            "entities": [
                {"name": "ACME Corporation", "type": "Organization"},
                {"name": "Globex Inc.", "type": "Organization"},
                {"name": "Berlin", "type": "City"},
            ],
            "relations": [
                {"source": "ACME Corporation", "type": "acquired", "target": "Globex Inc."},
                {"source": "ACME Corporation", "type": "locatedIn", "target": "Berlin"},
            ],
        }),
        respond.json({
            "entities": [
                {"name": "Ána Souza", "type": "Person"},
                {"name": "Acme", "type": "Organization"},
                {"name": "Roadrunner 2", "type": "Product"},
                {"name": "Lisbon", "type": "Location"},
            ],
            "relations": [
                {"source": "Ána Souza", "type": "worksFor", "target": "Acme"},
                {"source": "Acme", "type": "makes", "target": "Roadrunner 2"},
                {"source": "Ána Souza", "type": "presentedAt", "target": "Lisbon"},
            ],
        }),
        respond.refusal(),
    )

    result = await build_knowledge_graph(create_model(), DOCUMENTS, ONTOLOGY)
    print(f"Model calls: {len(fake_model.requests)} for {len(DOCUMENTS)} documents")

    print("\nEntities:")
    for entity in result["graph"]["entities"]:
        aliases = f" aka {', '.join(entity['aliases'])}" if entity["aliases"] else ""
        print(f"  {entity['id']:<26} {entity['name']}{aliases}  [sources: {', '.join(entity['sources'])}]")
    print("\nRelations:")
    for relation in result["graph"]["relations"]:
        print(f"  {relation['source']} -[{relation['type']}]-> {relation['target']}  [sources: {', '.join(relation['sources'])}]")
    print("\nRejected:")
    for rejection in result["rejected"]:
        print(f"  {rejection['documentId']}: {rejection['reason']}")
    print("\nFailed documents:")
    for failure in result["failed"]:
        print(f"  {failure['documentId']}: {failure['reason']}")


if __name__ == "__main__":
    asyncio.run(main())
