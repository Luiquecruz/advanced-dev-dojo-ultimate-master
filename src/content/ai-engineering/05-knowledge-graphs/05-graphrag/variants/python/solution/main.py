import json
import re


def adjacency(graph):
    """Undirected neighbor ids per entity id, in the order relations first connect them (no self-loops, known ids only)."""
    neighbors = {entity["id"]: [] for entity in graph["entities"]}
    for relation in graph["relations"]:
        source, target = relation["source"], relation["target"]
        if source != target and source in neighbors and target in neighbors:
            if target not in neighbors[source]:
                neighbors[source].append(target)
            if source not in neighbors[target]:
                neighbors[target].append(source)
    return neighbors


def detect_communities(graph, max_iterations=20):
    neighbors = adjacency(graph)
    ids = sorted(neighbors)
    labels = {entity_id: entity_id for entity_id in ids}

    def weight(left, right):
        return 1 + sum(1 for shared in neighbors[left] if shared in neighbors[right])

    for _iteration in range(max_iterations):
        changed = False
        for entity_id in ids:
            totals = {}
            for neighbor in neighbors[entity_id]:
                label = labels[neighbor]
                totals[label] = totals.get(label, 0) + weight(entity_id, neighbor)
            if not totals:
                continue
            best = min(totals, key=lambda label: (-totals[label], label))
            if best != labels[entity_id]:
                labels[entity_id] = best
                changed = True
        if not changed:
            break
    groups = {}
    for entity_id in ids:
        groups.setdefault(labels[entity_id], []).append(entity_id)
    ordered = sorted(groups.values(), key=lambda members: (-len(members), members[0]))
    return [{"id": f"community-{index + 1}", "members": members} for index, members in enumerate(ordered)]


def parse_object(text):
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end <= start:
        return None
    try:
        value = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None
    return value if isinstance(value, dict) else None


def is_filled_text(value):
    return isinstance(value, str) and value.strip() != ""


def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def summary_request(graph, community):
    members = set(community["members"])
    entity_lines = [f"- {entity['name']} ({entity['type']}): {entity['description']}" for entity in graph["entities"] if entity["id"] in members]
    name_of = {entity["id"]: entity["name"] for entity in graph["entities"]}
    relation_lines = [
        f"- {name_of[relation['source']]} -[{relation['type']}]-> {name_of[relation['target']]}"
        for relation in graph["relations"]
        if relation["source"] in members and relation["target"] in members
    ]
    relations_text = "\n".join(relation_lines) or "- none"
    return {
        "messages": [
            {"role": "system", "content": 'You write reports about one community of a knowledge graph. Reply with JSON only: {"title": "...", "summary": "..."}.'},
            {"role": "user", "content": "Entities:\n" + "\n".join(entity_lines) + "\n\nRelations:\n" + relations_text},
        ],
        "responseFormat": {"type": "json"},
    }


def fallback_report(graph, community):
    members = set(community["members"])
    neighbors = adjacency(graph)
    ranked = sorted(
        (
            {"name": entity["name"], "degree": sum(1 for neighbor in neighbors[entity["id"]] if neighbor in members)}
            for entity in graph["entities"]
            if entity["id"] in members
        ),
        key=lambda entry: (-entry["degree"], entry["name"]),
    )
    return {
        "communityId": community["id"],
        "title": ", ".join(entry["name"] for entry in ranked[:3]),
        "summary": "Members: " + ", ".join(entry["name"] for entry in ranked),
        "members": community["members"],
        "fallback": True,
    }


async def summarize_communities(model, graph, communities):
    reports = []
    for community in communities:
        request = summary_request(graph, community)
        report = None
        for _attempt in range(2):
            response = await model.generate(request)
            if response["finishReason"] in ("refusal", "content_filter"):
                break
            parsed = parse_object(response["text"])
            if parsed is not None and is_filled_text(parsed.get("title")) and is_filled_text(parsed.get("summary")):
                report = {"communityId": community["id"], "title": parsed["title"], "summary": parsed["summary"], "members": community["members"], "fallback": False}
                break
        reports.append(report if report is not None else fallback_report(graph, community))
    return reports


def route_question(question, graph):
    lowered = question.lower()
    entity_ids = [
        entity["id"]
        for entity in graph["entities"]
        if re.search(f"(^|[^a-z0-9]){re.escape(entity['name'].lower())}($|[^a-z0-9])", lowered)
    ]
    return {"mode": "local", "entityIds": entity_ids} if entity_ids else {"mode": "global"}


async def answer_local(model, question, graph, entity_ids, hops=1):
    neighbors = adjacency(graph)
    included = [entity_id for entity_id in entity_ids if entity_id in neighbors]
    seen = set(included)
    frontier = list(included)
    for _depth in range(hops):
        next_frontier = []
        for entity_id in frontier:
            for neighbor in neighbors[entity_id]:
                if neighbor not in seen:
                    seen.add(neighbor)
                    included.append(neighbor)
                    next_frontier.append(neighbor)
        frontier = next_frontier
    by_id = {entity["id"]: entity for entity in graph["entities"]}
    entity_lines = [f"- {by_id[entity_id]['name']} ({by_id[entity_id]['type']}): {by_id[entity_id]['description']}" for entity_id in included]
    relation_lines = [
        f"- {by_id[relation['source']]['name']} -[{relation['type']}]-> {by_id[relation['target']]['name']}"
        for relation in graph["relations"]
        if relation["source"] in seen and relation["target"] in seen
    ]
    relations_text = "\n".join(relation_lines) or "- none"
    response = await model.generate({
        "messages": [
            {"role": "system", "content": "Answer the question using only the knowledge graph context. Say so when the context is not enough."},
            {"role": "user", "content": "Entities:\n" + "\n".join(entity_lines) + "\n\nRelations:\n" + relations_text + f"\n\nQuestion: {question}"},
        ],
    })
    return {"mode": "local", "answer": response["text"], "entityIds": included}


async def answer_global(model, question, reports, batch_size=2, max_points=5):
    points = []
    for start in range(0, len(reports), batch_size):
        batch = reports[start : start + batch_size]
        sections = "\n\n".join(f"## {report['title']}\n{report['summary']}" for report in batch)
        response = await model.generate({
            "messages": [
                {
                    "role": "system",
                    "content": 'From the community reports, list the points that help answer the question. Rate each point from 0 (useless) to 100 (essential). Reply with JSON only: {"points": [{"text": "...", "score": 0}]}.',
                },
                {"role": "user", "content": f"{sections}\n\nQuestion: {question}"},
            ],
            "responseFormat": {"type": "json"},
        })
        parsed = parse_object(response["text"])
        if response["finishReason"] != "stop" or parsed is None or not isinstance(parsed.get("points"), list):
            continue
        for point in parsed["points"]:
            if isinstance(point, dict) and is_filled_text(point.get("text")) and is_number(point.get("score")) and point["score"] > 0:
                points.append({"text": point["text"], "score": point["score"]})
    best = sorted(points, key=lambda point: -point["score"])[:max_points]
    if not best:
        return {"mode": "global", "answer": None, "points": []}
    point_lines = "\n".join(f"- ({point['score']}) {point['text']}" for point in best)
    response = await model.generate({
        "messages": [
            {"role": "system", "content": "Write the final answer from the rated points, most important first. Use only these points."},
            {"role": "user", "content": f"Points:\n{point_lines}\n\nQuestion: {question}"},
        ],
    })
    return {"mode": "global", "answer": response["text"], "points": best}
