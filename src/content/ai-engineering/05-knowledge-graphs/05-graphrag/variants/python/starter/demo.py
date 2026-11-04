import asyncio

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import answer_global, answer_local, detect_communities, route_question, summarize_communities

GRAPH = {
    "entities": [
        {"id": "acme", "name": "Acme", "type": "Supplier", "description": "Metal parts supplier, single plant in Germany."},
        {"id": "bolt", "name": "Bolt M4", "type": "Part", "description": "Steel bolt, single source."},
        {"id": "hinge", "name": "Hinge", "type": "Part", "description": "Steel hinge."},
        {"id": "kettle", "name": "Kettle", "type": "Product", "description": "Electric kettle, best seller."},
        {"id": "toaster", "name": "Toaster", "type": "Product", "description": "Two-slot toaster."},
        {"id": "globex", "name": "Globex", "type": "Supplier", "description": "Plastics supplier in Poland."},
        {"id": "lid", "name": "Lid", "type": "Part", "description": "Plastic lid."},
        {"id": "handle", "name": "Handle", "type": "Part", "description": "Plastic handle."},
        {"id": "blender", "name": "Blender", "type": "Product", "description": "Countertop blender."},
    ],
    "relations": [
        {"source": "acme", "target": "bolt", "type": "SUPPLIES"},
        {"source": "acme", "target": "hinge", "type": "SUPPLIES"},
        {"source": "bolt", "target": "kettle", "type": "USED_IN"},
        {"source": "hinge", "target": "kettle", "type": "USED_IN"},
        {"source": "bolt", "target": "toaster", "type": "USED_IN"},
        {"source": "hinge", "target": "toaster", "type": "USED_IN"},
        {"source": "globex", "target": "lid", "type": "SUPPLIES"},
        {"source": "globex", "target": "handle", "type": "SUPPLIES"},
        {"source": "lid", "target": "blender", "type": "USED_IN"},
        {"source": "handle", "target": "blender", "type": "USED_IN"},
        {"source": "handle", "target": "kettle", "type": "USED_IN"},
    ],
}


async def main():
    model = create_model()
    communities = detect_communities(GRAPH)
    print("Communities:")
    for community in communities:
        print(f"  {community['id']}: {', '.join(community['members'])}")

    fake_model.reply(
        respond.json({"title": "Steel parts from Acme", "summary": "Acme is the single source of bolts and hinges used in kettles and toasters."}),
        respond.text("Plastics, mostly."),
        respond.refusal(),
    )
    reports = await summarize_communities(model, GRAPH, communities)
    print("\nCommunity reports:")
    for report in reports:
        marker = " (fallback)" if report["fallback"] else ""
        print(f"  {report['communityId']}{marker}: {report['title']} - {report['summary']}")

    local_question = "Which products use parts from Acme?"
    local_route = route_question(local_question, GRAPH)
    fake_model.reply(respond.text("Kettles and toasters use Acme bolts and hinges."))
    if local_route["mode"] == "local":
        local = await answer_local(model, local_question, GRAPH, local_route["entityIds"], hops=2)
        print(f"\n[local] {local_question}\n  context: {', '.join(local['entityIds'])}\n  answer: {local['answer']}")

    global_question = "What are the main supply risks across the catalog?"
    print(f"\n[{route_question(global_question, GRAPH)['mode']}] {global_question}")
    fake_model.reply(
        respond.json({"points": [{"text": "Acme is a single source for steel parts in two best sellers", "score": 92}, {"text": "Hinges are standard parts", "score": 5}]}),
        respond.json({"points": [{"text": "Kettles also depend on Globex handles", "score": 60}]}),
        respond.text("The biggest risk is Acme as a single source for kettles and toasters; kettles also depend on Globex."),
    )
    result = await answer_global(model, global_question, reports, batch_size=1, max_points=2)
    for point in result["points"]:
        print(f"  point ({point['score']}): {point['text']}")
    print(f"  answer: {result['answer'] if result['answer'] is not None else 'not enough evidence'}")


if __name__ == "__main__":
    asyncio.run(main())
