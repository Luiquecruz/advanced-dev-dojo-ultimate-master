import re

SHAPES_PER_SERVICE = [14, 9, 7]
SHARED_SHAPES = 6
BASELINE = (3, 12)
INTERFACE_WORDS = {"protocol": "protocol", "abc": "abc", "concrete_base": "base class"}
PAYLOAD_WORDS = {"typeddict": "typeddict", "dataclass": "dataclass", "dict": "dict"}


def is_integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def distinct(values):
    cleaned = [value.strip().lower() for value in values]
    return len(set(cleaned)) == len(cleaned)


@test("the ADR record is complete and its context is grounded in the briefing")
def _():
    adr = mod.ADR
    assert is_integer(adr["id"]) and adr["id"] > 0
    assert adr["status"] == "accepted"
    assert len(adr["title"].strip()) >= 10
    assert len(adr["context"].strip()) >= 80
    assert re.search(r"plugin", adr["context"], re.IGNORECASE)
    assert re.search(r"payload", adr["context"], re.IGNORECASE)
    assert len(adr["decision"].strip()) >= 40
    assert re.match(r"we will\b", adr["decision"].strip(), re.IGNORECASE)


@test("the ADR alternatives and consequences have the expected shape")
def _():
    adr = mod.ADR
    assert isinstance(adr["alternatives"], list)
    assert len(adr["alternatives"]) >= 2
    for alternative in adr["alternatives"]:
        assert len(alternative["option"].strip()) >= 3
        assert len(alternative["reason"].strip()) >= 20
    assert distinct([alternative["option"] for alternative in adr["alternatives"]])
    for side in ["positive", "negative"]:
        items = adr["consequences"][side]
        assert isinstance(items, list)
        assert len(items) >= 1
        for item in items:
            assert len(item.strip()) >= 15


@test("the plan uses only known values for every field")
def _():
    plan = mod.PLAN
    assert plan["plugin_interface"] in ["protocol", "abc", "concrete_base"]
    assert isinstance(plan["runtime_checkable"], bool)
    assert plan["payloads"] in ["typeddict", "dataclass", "dict"]
    assert is_integer(plan["payload_definitions"])
    assert plan["edge_validation"] in ["runtime_validator", "none"]
    assert plan["generics_syntax"] in ["pep695", "typevar"]
    assert plan["checker"] in ["pyright", "mypy", "none"]


@test("the payload definition count is computed from the briefing and the ADR cites it")
def _():
    definitions = mod.PLAN["payload_definitions"]
    expected = sum(SHAPES_PER_SERVICE) - SHARED_SHAPES
    assert definitions == approx(expected)
    adr = mod.ADR
    cited = re.findall(r"\d+", adr["context"] + " " + adr["decision"])
    assert str(definitions) in cited


@test("the plugin interface fits outside authors and the registry's runtime check, and the decision names it")
def _():
    plan = mod.PLAN
    interface = plan["plugin_interface"]
    assert interface != "concrete_base"
    assert interface != "abc"
    if interface == "protocol":
        assert plan["runtime_checkable"] is True
    decision = mod.ADR["decision"].lower()
    assert INTERFACE_WORDS[interface] in decision


@test("payload typing, edge validation, generics syntax, checker and rejected options are coherent with the briefing")
def _():
    plan = mod.PLAN
    payloads = plan["payloads"]
    assert payloads != "dataclass"
    assert payloads != "dict"
    if payloads in ["typeddict", "dict"]:
        assert plan["edge_validation"] == "runtime_validator"
    if BASELINE >= (3, 12):
        assert plan["generics_syntax"] == "pep695"
    assert plan["checker"] != "none"
    decision = mod.ADR["decision"].lower()
    assert PAYLOAD_WORDS[payloads] in decision
    rejected = plan["rejected"]
    assert isinstance(rejected, list)
    assert len(rejected) >= 2
    for entry in rejected:
        assert len(entry["pattern"].strip()) >= 3
        assert len(entry["reason"].strip()) >= 20
    assert distinct([entry["pattern"] for entry in rejected])
