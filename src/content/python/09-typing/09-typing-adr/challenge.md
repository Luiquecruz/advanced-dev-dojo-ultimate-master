Write the ADR and the plan for the **typing strategy of a public Python SDK**.

## Briefing

The platform team publishes `acme-sdk`, a Python package consumed by **20 internal teams** and installed by **plugin authors outside the company**.

- **Payloads:** the SDK wraps 3 services that send JSON. The orders service exposes **14** payload shapes, billing **9** and shipping **7**. **6** of those shapes (addresses, money amounts, customer references...) are each exposed by **two** services with identical fields, and the SDK must define every shape **once**.
- **Consumers:** payloads are decoded with `json.loads` and handed to the teams unchanged. Teams index them (`payload["total"]`), merge them and send them on as JSON; turning them into objects would break all 20 teams. The teams asked for editor completion and checker errors on misspelled keys.
- **Edge:** data from the services is untrusted. It must be validated at runtime **once, at the edge** where the SDK receives it, and nowhere else.
- **Plugins:** outside authors write plugins with a `name` attribute and a `handle(payload)` method. The SDK must **not force them to inherit** from any SDK class (several already subclass their own frameworks). `registry.register(plugin)` must reject, at call time, an object that lacks `name` or `handle`.
- **Baseline:** Python **3.12** or newer. The style guide asks for the newest syntax that the baseline supports.
- **CI:** the SDK's own code must be type-checked on every pull request; today nothing checks it.

## Task

In `adr.py`, define two constants.

**`ADR`**, the record:

- `id`: a positive integer; `title`: at least 10 characters; `status`: `"accepted"`.
- `context`: at least 80 characters; mentions the `plugin`s and the `payload`s.
- `decision`: at least 40 characters, starts with `We will`, and names the plugin interface you chose (`Protocol`, `ABC` or `base class`) and the payload type (`TypedDict`, `dataclass` or `dict`).
- `alternatives`: at least two `{"option", "reason"}` with distinct options (at least 3 characters) and reasons of at least 20 characters.
- `consequences`: `{"positive": [...], "negative": [...]}`, each with at least one item of at least 15 characters.
- The context or the decision states the number of payload definitions, in digits.

**`PLAN`**, the design:

- `plugin_interface`: `"protocol"`, `"abc"` or `"concrete_base"`.
- `runtime_checkable`: `True` or `False`, whether `isinstance` can test plugins against the interface.
- `payloads`: `"typeddict"`, `"dataclass"` or `"dict"`.
- `payload_definitions`: an integer, how many payload types the SDK defines. Compute it from the briefing.
- `edge_validation`: `"runtime_validator"` or `"none"`.
- `generics_syntax`: `"pep695"` or `"typevar"`.
- `checker`: `"pyright"`, `"mypy"` or `"none"`.
- `rejected`: at least two `{"pattern", "reason"}` with distinct patterns (at least 3 characters) and reasons of at least 20 characters.

The plan must be coherent with the briefing. The tests check these relationships, so reason from the facts rather than from the field names:

1. The definition count follows from the three services and the shapes they share, and the ADR cites it.
2. Plugin authors are outside the company and cannot be made to inherit; the registry checks plugins at runtime.
3. Payloads stay dicts for the consumers and still get key checking from a checker.
4. Nothing in the payload types validates at runtime, and the data is untrusted.
5. The generics syntax is the newest one the baseline runs.
6. CI must type-check the SDK.

The tests check structure and coherence, not your wording.
