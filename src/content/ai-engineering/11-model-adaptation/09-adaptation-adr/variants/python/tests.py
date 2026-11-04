import re

TARGETS = {"typeAccuracy": 0.93, "validJson": 0.995, "p95Ms": 800}
RUNGS = ["prompt", "retrieval", "examples-and-tools", "fine-tuning", "training"]
WEIGHT_RUNGS = ["fine-tuning", "training"]

LADDER = {
    "prompt": {"typeAccuracy": 0.81, "validJson": 0.972, "p95Ms": 340},
    "retrieval": {"typeAccuracy": 0.845, "validJson": 0.981, "p95Ms": 610},
    "examples-and-tools": {"typeAccuracy": 0.889, "validJson": 0.994, "p95Ms": 720},
    "fine-tuning": {"typeAccuracy": 0.95, "validJson": 0.999, "p95Ms": 290},
}

BASE_MODELS = {
    "wren-8b-instruct": {"billionsOfParameters": 8, "kvMegabytesPerToken": 0.125, "commercialUse": True, "safetensors": True, "verifiedPublisher": True, "revision": "a41c9e7"},
    "kestrel-9b-chat": {"billionsOfParameters": 9, "kvMegabytesPerToken": 0.25, "commercialUse": False, "safetensors": True, "verifiedPublisher": True, "revision": "77d02b1"},
    "heron-8b-merge": {"billionsOfParameters": 8, "kvMegabytesPerToken": 0.125, "commercialUse": False, "safetensors": False, "verifiedPublisher": False, "revision": "c0ffee1"},
    "osprey-32b-instruct": {"billionsOfParameters": 32, "kvMegabytesPerToken": 0.25, "commercialUse": True, "safetensors": True, "verifiedPublisher": True, "revision": "5be2a90"},
}

BYTES_PER_WEIGHT = {"bf16": 2, "fp8": 1, "int4": 0.5}

QUANTIZED_RESULTS = {
    "wren-8b-instruct/bf16": {"typeAccuracy": 0.95, "validJson": 0.999},
    "wren-8b-instruct/fp8": {"typeAccuracy": 0.947, "validJson": 0.999},
    "wren-8b-instruct/int4": {"typeAccuracy": 0.924, "validJson": 0.996},
}

TRAINING_BYTES_PER_PARAMETER = {"full": 16, "lora": 2, "qlora": 0.5}
TRAINING_GPU_GB = 48
SERVING_GPU_GB = 24
CONCURRENT_SEQUENCES = 64
TOKENS_PER_SEQUENCE = 1024
OVERHEAD_GB = 2
LABELED_NOTES = 9000
EVAL_NOTES = 500
PLATEAU_NOTES = 4000

RERUN_EVENTS = ["new-training-data", "base-model-revision", "quantization-change", "runtime-upgrade", "weekly-schedule"]
SUPPLY_CHAIN_CHECKS = ["license-allows-commercial-use", "verified-publisher", "pinned-revision", "file-hashes", "safetensors-only", "malware-scan", "signature-verification", "internal-mirror", "ai-bom-entry"]
REQUIRED_CHECKS = ["license-allows-commercial-use", "verified-publisher", "pinned-revision", "file-hashes", "safetensors-only", "ai-bom-entry"]


def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def is_integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def meets_targets(result):
    fast_enough = "p95Ms" not in result or result["p95Ms"] <= TARGETS["p95Ms"]
    return result["typeAccuracy"] >= TARGETS["typeAccuracy"] and result["validJson"] >= TARGETS["validJson"] and fast_enough


def base_model(model_id):
    if model_id not in BASE_MODELS:
        raise AssertionError(f'"{model_id}" is not a base model from the briefing table')
    return BASE_MODELS[model_id]


def serving_memory_gb():
    plan = mod.ADAPTATION_PLAN
    model = base_model(plan["supplyChain"]["baseModel"])
    quantization = plan["serving"]["quantization"]
    if quantization not in BYTES_PER_WEIGHT:
        raise AssertionError(f'"{quantization}" is not a quantization from the briefing table')
    kv_cache_gb = CONCURRENT_SEQUENCES * TOKENS_PER_SEQUENCE * model["kvMegabytesPerToken"] / 1024
    return model["billionsOfParameters"] * BYTES_PER_WEIGHT[quantization] + kv_cache_gb + OVERHEAD_GB


@test('the ADR is an accepted model-layer decision whose context names the eval targets and the privacy constraint, with a "We will" decision')
def _():
    adr = mod.ADR
    assert is_integer(adr["id"]) and adr["id"] > 0
    assert adr["status"] == "accepted"
    assert adr["layer"] == "model"
    assert len(adr["title"].strip()) >= 10
    assert len(adr["context"].strip()) >= 80
    assert re.search(r"accura|eval", adr["context"], re.IGNORECASE)
    assert re.search(r"privacy|personal data|contract|self-host|own GPU|third-party", adr["context"], re.IGNORECASE)
    assert len(adr["decision"].strip()) >= 40
    assert re.match(r"we will\b", adr["decision"].strip(), re.IGNORECASE)


@test("lists at least two distinct rejected alternatives with reasons, and positive and negative consequences")
def _():
    adr = mod.ADR
    assert isinstance(adr["alternatives"], list)
    assert len(adr["alternatives"]) >= 2
    for alternative in adr["alternatives"]:
        assert len(alternative["option"].strip()) >= 3
        assert len(alternative["reason"].strip()) >= 20
    options = [alternative["option"].strip().lower() for alternative in adr["alternatives"]]
    assert len(set(options)) == len(options)
    for side in ["positive", "negative"]:
        items = adr["consequences"][side]
        assert isinstance(items, list)
        assert len(items) >= 1
        for item in items:
            assert len(item.strip()) >= 15


@test("climbs to the lowest rung that meets every target, against the best rung below it, with a method that fits the training GPU")
def _():
    plan = mod.ADAPTATION_PLAN
    lowest_passing = next((rung for rung in RUNGS if rung in LADDER and meets_targets(LADDER[rung])), None)
    assert plan["rung"] == lowest_passing
    rungs_below = [rung for rung in RUNGS[: RUNGS.index(plan["rung"])] if rung in LADDER]
    best_below = max(rungs_below, key=lambda rung: LADDER[rung]["typeAccuracy"])
    assert plan["evalGate"]["baseline"] == best_below
    assert plan["rung"] in WEIGHT_RUNGS
    assert plan["method"] in TRAINING_BYTES_PER_PARAMETER
    training_memory_gb = base_model(plan["supplyChain"]["baseModel"])["billionsOfParameters"] * TRAINING_BYTES_PER_PARAMETER[plan["method"]]
    assert training_memory_gb <= TRAINING_GPU_GB


@test("the data plan keeps the eval set frozen, redacts personal data, caps synthetic data and keeps weekly facts out of the weights")
def _():
    plan = mod.ADAPTATION_PLAN
    data = plan["data"]
    assert is_integer(data["trainingExamples"])
    assert data["trainingExamples"] >= PLATEAU_NOTES
    assert data["trainingExamples"] <= LABELED_NOTES - EVAL_NOTES
    assert data["evalExamples"] == EVAL_NOTES
    assert data["redactPersonalData"] is True
    assert is_number(data["maxSyntheticShare"])
    assert data["maxSyntheticShare"] >= 0
    assert data["maxSyntheticShare"] <= 0.2
    assert plan["freshFacts"] in ["prompt", "retrieval", "tools"]


@test("the eval gate is at least as strict as the targets and reruns when data, base model or quantization change")
def _():
    gate = mod.ADAPTATION_PLAN["evalGate"]
    assert gate["minTypeAccuracy"] >= TARGETS["typeAccuracy"]
    assert gate["minTypeAccuracy"] <= 1
    assert gate["minValidJson"] >= TARGETS["validJson"]
    assert gate["minValidJson"] <= 1
    for event in gate["rerunOn"]:
        assert event in RERUN_EVENTS, event
    for event in ["new-training-data", "base-model-revision", "quantization-change"]:
        assert event in gate["rerunOn"], event


@test("serves on a production engine with a quantization that meets the targets and fits the 24 GB GPU by the memory formula")
def _():
    plan = mod.ADAPTATION_PLAN
    serving = plan["serving"]
    assert serving["engine"] in ["vllm", "sglang"]
    key = f'{plan["supplyChain"]["baseModel"]}/{serving["quantization"]}'
    if key not in QUANTIZED_RESULTS:
        raise AssertionError(f"the briefing has no eval result for {key}")
    assert meets_targets(QUANTIZED_RESULTS[key])
    expected = serving_memory_gb()
    estimated = serving["estimatedGpuMemoryGb"]
    assert expected <= SERVING_GPU_GB
    assert is_number(estimated)
    assert abs(estimated - expected) <= expected * 0.1
    assert estimated <= SERVING_GPU_GB


@test("the base model passes the supply-chain policy at its pinned revision, with remote code off and every policy check listed")
def _():
    supply_chain = mod.ADAPTATION_PLAN["supplyChain"]
    model = base_model(supply_chain["baseModel"])
    assert model["commercialUse"] is True
    assert model["safetensors"] is True
    assert model["verifiedPublisher"] is True
    assert supply_chain["revision"] == model["revision"]
    assert supply_chain["weightsFormat"] == "safetensors"
    assert supply_chain["trustRemoteCode"] is False
    for check in supply_chain["checks"]:
        assert check in SUPPLY_CHAIN_CHECKS, check
    for check in REQUIRED_CHECKS:
        assert check in supply_chain["checks"], check
