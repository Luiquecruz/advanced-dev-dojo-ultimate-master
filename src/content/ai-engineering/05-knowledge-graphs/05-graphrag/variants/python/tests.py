from dojo_ai import create_model


def entity(entity_id, entity_type="Thing"):
    return {"id": entity_id, "name": entity_id.replace("-", " "), "type": entity_type, "description": f"About {entity_id}."}


def graph_of(ids, pairs):
    return {"entities": [entity(entity_id) for entity_id in ids], "relations": [{"source": source, "target": target, "type": "LINKED"} for source, target in pairs]}


def clique(ids):
    return [(left, right) for index, left in enumerate(ids) for right in ids[index + 1 :]]


def create_random(seed):
    state = float(seed)

    def random():
        nonlocal state
        state = (state * 1103515245 + 12345) % 2147483648
        return state / 2147483648

    return random


def shuffle(items, random):
    copy = list(items)
    for index in range(len(copy) - 1, 0, -1):
        other = int(random() * (index + 1))
        copy[index], copy[other] = copy[other], copy[index]
    return copy


def members_of(communities):
    return [community["members"] for community in communities]


def prompt_of(request):
    return "\n".join(message["content"] for message in request["messages"])


def supply_graph():
    return {
        "entities": [
            {"id": "acme", "name": "Acme", "type": "Supplier", "description": "Metal parts supplier in Germany."},
            {"id": "bolt", "name": "Bolt M4", "type": "Part", "description": "Steel bolt."},
            {"id": "kettle", "name": "Kettle", "type": "Product", "description": "Electric kettle."},
            {"id": "reach", "name": "REACH", "type": "Regulation", "description": "EU chemicals regulation."},
            {"id": "globex", "name": "Globex", "type": "Supplier", "description": "Plastics supplier."},
            {"id": "lid", "name": "Lid", "type": "Part", "description": "Plastic lid."},
        ],
        "relations": [
            {"source": "acme", "target": "bolt", "type": "SUPPLIES"},
            {"source": "bolt", "target": "kettle", "type": "USED_IN"},
            {"source": "kettle", "target": "reach", "type": "SUBJECT_TO"},
            {"source": "globex", "target": "lid", "type": "SUPPLIES"},
        ],
    }


def reports(count):
    return [
        {"communityId": f"community-{index + 1}", "title": f"Report title {index + 1}", "summary": f"Summary of community {index + 1}.", "members": [], "fallback": False}
        for index in range(count)
    ]


@test("detect_communities splits two dense groups joined by a single bridge, and keeps isolated entities apart")
def _():
    left = ["a1", "a2", "a3", "a4"]
    right = ["b1", "b2", "b3", "b4"]
    for bridge in [("a4", "b1"), ("a1", "b4"), ("a2", "b3")]:
        graph = graph_of([*left, *right, "loner"], [*clique(left), *clique(right), bridge])
        communities = mod.detect_communities(graph)
        assert members_of(communities) == [left, right, ["loner"]], bridge
        assert [community["id"] for community in communities] == ["community-1", "community-2", "community-3"]


@test("detect_communities finds three groups in a chain, ordered by size, and the result does not depend on input order")
async def _():
    groups = [["c1", "c2", "c3"], ["d1", "d2", "d3", "d4", "d5"], ["e1", "e2", "e3", "e4"]]
    pairs = [pair for group in groups for pair in clique(group)] + [("c3", "d1"), ("d5", "e1")]
    ids = [entity_id for group in groups for entity_id in group]
    expected = [groups[1], groups[2], groups[0]]
    assert members_of(mod.detect_communities(graph_of(ids, pairs))) == expected

    def scenario(seed):
        random = create_random(seed)
        shuffled_ids = shuffle(ids, random)
        shuffled_pairs = [(source, target) if random() < 0.5 else (target, source) for source, target in shuffle(pairs, random)]
        assert members_of(mod.detect_communities(graph_of(shuffled_ids, shuffled_pairs))) == expected

    await for_each_seed(10, scenario)


@test("detect_communities puts every entity in exactly one community and never joins disconnected entities")
def _():
    for seed in range(1, 21):
        random = create_random(seed)
        ids = [f"n{index:02d}" for index in range(14)]
        pairs = []
        for _count in range(16):
            pairs.append((ids[int(random() * len(ids))], ids[int(random() * len(ids))]))
        communities = mod.detect_communities(graph_of(ids, pairs))
        assert sorted(member for community in communities for member in community["members"]) == ids, f"seed {seed}"
        component = {entity_id: entity_id for entity_id in ids}

        def find(entity_id):
            return entity_id if component[entity_id] == entity_id else find(component[entity_id])

        for left, right in pairs:
            component[find(left)] = find(right)
        for community in communities:
            assert len({find(member) for member in community["members"]}) == 1, f"seed {seed}, {community['members']}"


@test("summarize_communities sends each community only its own entities and relations and survives malformed JSON")
async def _():
    graph = supply_graph()
    communities = [
        {"id": "community-1", "members": ["acme", "bolt", "kettle", "reach"]},
        {"id": "community-2", "members": ["globex", "lid"]},
    ]

    async def scenario():
        kettle_report = {"title": "Kettle supply chain", "summary": "Acme bolts go into kettles under REACH."}
        kettle_calls = 0

        def answer(request, context):
            nonlocal kettle_calls
            if not any("Acme" in message["content"] for message in request["messages"]):
                return respond.json({"title": "Plastics", "summary": "Globex supplies lids."})
            kettle_calls += 1
            return respond.malformed_json(kettle_report) if kettle_calls == 1 else respond.json(kettle_report)

        fake_model.handle(answer)
        result = await mod.summarize_communities(create_model(), graph, communities)
        assert result == [
            {"communityId": "community-1", "title": "Kettle supply chain", "summary": "Acme bolts go into kettles under REACH.", "members": communities[0]["members"], "fallback": False},
            {"communityId": "community-2", "title": "Plastics", "summary": "Globex supplies lids.", "members": communities[1]["members"], "fallback": False},
        ]
        prompts = [prompt_of(request) for request in fake_model.requests]
        first = prompts[0]
        last = prompts[-1]
        for text in ["Acme", "Bolt M4", "Kettle", "REACH", "SUPPLIES", "USED_IN", "SUBJECT_TO"]:
            assert text in first, text
        for text in ["Globex", "Lid"]:
            assert text not in first, text
        for text in ["Globex", "Lid", "SUPPLIES"]:
            assert text in last, text
        for text in ["Acme", "Kettle", "USED_IN"]:
            assert text not in last, text
        assert len(fake_model.requests) <= 3

    await for_each_seed(16, scenario)


@test("summarize_communities falls back to a report built from the graph after two unusable replies or a refusal")
async def _():
    graph = supply_graph()
    communities = [
        {"id": "community-1", "members": ["acme", "bolt", "kettle", "reach"]},
        {"id": "community-2", "members": ["globex", "lid"]},
    ]
    fake_model.reply(respond.text("A supply chain."), respond.json({"title": "", "summary": "x"}), respond.refusal())
    first, second = await mod.summarize_communities(create_model(), graph, communities)
    assert len(fake_model.requests) == 3
    assert first["fallback"] is True
    assert first["communityId"] == "community-1"
    assert first["title"] == "Bolt M4, Kettle, Acme"
    for name in ["Acme", "Bolt M4", "Kettle", "REACH"]:
        assert name in first["summary"], name
    assert second["fallback"] is True
    assert second["title"] == "Globex, Lid"


@test("route_question sends questions naming an entity to local search and the rest to global search")
def _():
    graph = supply_graph()
    assert mod.route_question("Which products use parts from Acme?", graph) == {"mode": "local", "entityIds": ["acme"]}
    assert mod.route_question("Is the kettle subject to reach?", graph) == {"mode": "local", "entityIds": ["kettle", "reach"]}
    assert mod.route_question("What does bolt m4 go into?", graph) == {"mode": "local", "entityIds": ["bolt"]}
    assert mod.route_question("What are the main supply risks across our portfolio?", graph) == {"mode": "global"}
    assert mod.route_question("Do any kettles or globexes matter? Acmeco?", graph) == {"mode": "global"}


@test("answer_local grounds the answer in the entity neighborhood up to the hop limit")
async def _():
    graph = supply_graph()
    fake_model.reply(respond.text("Acme supplies the bolt."), respond.text("Acme bolts end up in the kettle."))
    one_hop = await mod.answer_local(create_model(), "What does Acme supply?", graph, ["acme"])
    assert one_hop == {"mode": "local", "answer": "Acme supplies the bolt.", "entityIds": ["acme", "bolt"]}
    prompt = prompt_of(fake_model.requests[0])
    for text in ["Acme", "Bolt M4", "Steel bolt.", "SUPPLIES", "What does Acme supply?"]:
        assert text in prompt, text
    for text in ["Kettle", "Globex", "USED_IN"]:
        assert text not in prompt, text
    two_hops = await mod.answer_local(create_model(), "Where do Acme parts end up?", graph, ["acme"], hops=2)
    assert two_hops["entityIds"] == ["acme", "bolt", "kettle"]
    assert "USED_IN" in prompt_of(fake_model.requests[1])


@test("answer_global maps batches of community reports to rated points, skips unusable batches and reduces the best points in score order")
async def _():
    async def scenario():
        fake_model.reply(
            respond.json({"points": [{"text": "Single-source bolts", "score": 90}, {"text": "Minor packaging delay", "score": 10}]}),
            respond.one_of([respond.malformed_json({"points": [{"text": "Hidden point", "score": 99}]}), respond.refusal()]),
            respond.json({"points": [{"text": "Plastics price spike", "score": 70}, {"text": "Irrelevant trivia", "score": 0}, {"text": "Regulatory change in REACH", "score": 80}]}),
            respond.text("Main risks: single-source bolts, REACH changes, plastics prices."),
        )
        result = await mod.answer_global(create_model(), "What are the main supply risks?", reports(5), batch_size=2, max_points=3)
        prompts = [prompt_of(request) for request in fake_model.requests]
        responses = fake_model.responses
        malformed_was_fenced = len(responses) > 1 and "```" in responses[1]["text"] and responses[1]["finishReason"] == "stop"
        assert len(prompts) == 4
        assert "Report title 1" in prompts[0]
        assert "Report title 2" in prompts[0]
        assert "Report title 3" not in prompts[0]
        assert "Report title 5" in prompts[2]
        assert "Report title 4" not in prompts[2]
        assert fake_model.requests[0]["responseFormat"] == {"type": "json"}
        expected = (
            ["Hidden point", "Single-source bolts", "Regulatory change in REACH"]
            if malformed_was_fenced
            else ["Single-source bolts", "Regulatory change in REACH", "Plastics price spike"]
        )
        assert [point["text"] for point in result["points"]] == expected
        assert result["answer"] == "Main risks: single-source bolts, REACH changes, plastics prices."
        reduce = prompts[3]
        for text in expected:
            assert text in reduce, text
        assert reduce.index(expected[0]) < reduce.index(expected[1])
        assert reduce.index(expected[1]) < reduce.index(expected[2])
        for text in ["Minor packaging delay", "Irrelevant trivia"]:
            assert text not in reduce, text

    await for_each_seed(12, scenario)


@test("answer_global returns no answer and skips the reduce call when no batch produced a useful point")
async def _():
    fake_model.reply(respond.json({"points": [{"text": "Nothing relevant", "score": 0}]}), respond.text("no idea"), respond.text("should not be called"))
    result = await mod.answer_global(create_model(), "What are the main supply risks?", reports(3), batch_size=2)
    assert result == {"mode": "global", "answer": None, "points": []}
    assert len(fake_model.requests) == 2
