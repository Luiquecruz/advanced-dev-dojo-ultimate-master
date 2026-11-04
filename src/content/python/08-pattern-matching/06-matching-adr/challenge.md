Write the ADR and the plan for **how a message gateway dispatches messages to their handlers**.

## Briefing

`relay` is an API gateway that receives messages and calls the handler registered for each message type. It runs on CPython 3.14.

- **Growth:** today the gateway knows **25** message types. Product teams add **5** new types per quarter, and the plan must hold for the next **8** quarters.
- **Load:** at peak, **1 200 000** messages per minute arrive, spread evenly over **4** gateway instances. Every message is dispatched exactly once.
- **Budget:** the CPU profile allows dispatch (from a decoded payload to the call of its handler) at most **2%** of one core per instance.
- **Measured cost** on the gateway hardware: in a `match` statement or an `if`/`elif` chain, every case a message fails before reaching its own costs **0.13 µs**; a message of an unknown type fails every case. A dict lookup costs **0.06 µs** and a cached `functools.singledispatch` call **0.22 µs**.
- **Payloads:** **40%** arrive as JSON dicts from public webhooks (`{"type": "order.paid", "version": 2, ...}`), with up to **3** payload versions per type in flight. **60%** arrive as dataclass instances from the internal SDK. The dataclasses are **generated** from the shared schema on every build, so hand edits to them are overwritten; each one has a `TYPE` class attribute holding its type tag. Handlers must receive one payload shape and must not re-validate dict keys.
- **Teams:** **3** teams (payments, logistics, notifications) write the handlers for their own types in their own packages. A file that every team edits, such as `relay/dispatch.py`, may change at most **once per quarter**, after a review by the platform team.
- **Unknown types** go to the dead-letter topic with their tag. Nothing is dropped silently or answered by a default handler.

## Task

In `adr.py`, define two constants.

**`ADR`**, the record:

- `id`: a positive integer; `title`: at least 10 characters; `status`: `"accepted"`.
- `context`: at least 80 characters; mentions the message `type`s and the `team`s.
- `decision`: at least 40 characters, starts with `We will`, and names the dispatch mechanism you chose (`registry` or `singledispatch` when you choose one of them) and `match` when you give it a role.
- `alternatives`: at least two `{"option", "reason"}` with distinct options (at least 3 characters) and reasons of at least 20 characters.
- `consequences`: `{"positive": [...], "negative": [...]}`, each with at least one item of at least 15 characters.

**`PLAN`**, the design:

- `dispatch`: `"match"`, `"if_elif"`, `"dict_registry"`, `"singledispatch"` or `"polymorphism"` (a `handle()` method on each payload class), how a payload reaches its handler.
- `registry_key`: `"type_tag"`, `"payload_class"` or `"none"`, what the dispatch looks up.
- `payload_model`: `"dataclasses"` (webhook dicts are decoded into the SDK dataclasses before dispatch), `"dicts"` (SDK objects are turned into dicts) or `"mixed"` (handlers accept both).
- `match_role`: `"central_router"` (one `match` over every type), `"leaf_decoder"` (a small `match` inside the decoder of one type) or `"none"`.
- `extension_point`: `"registry"`, `"edit_match"` or `"subclass"`, what a team does to add a type.
- `unknown_types`: `"raise_to_dead_letter"` or `"silent_default"`.
- `types_at_horizon`: an integer, the number of message types at the end of the planning horizon.
- `lookups_per_second`: an integer, the dispatches **one instance** performs per second at peak.
- `linear_worst_case_us`: a number, the worst-case cost in µs of one dispatch through a single `match` or `if`/`elif` over every type at the horizon.
- `shared_file_edits_per_quarter`: an integer, how many times per quarter your extension point makes teams edit a file that every team shares.
- `rejected`: at least two `{"pattern", "reason"}` with distinct patterns (at least 3 characters) and reasons of at least 20 characters.

The plan must be coherent with the briefing. The tests check these relationships, so reason from the numbers rather than from the field names:

1. The three figures follow from the growth, the load and the measured cost per failed case.
2. A dispatch whose cost grows with the number of types is acceptable only if its worst case at the horizon fits the per-message budget, which follows from the CPU share and the per-instance rate.
3. The dispatch can tell payloads apart with the key it uses, and handlers receive exactly one payload shape that needs no re-validation.
4. Adding a type must not require editing code that is regenerated on every build.
5. The shared-file edits follow from the extension point and the growth rate, and they respect the merge rule.
6. The extension point is the one your dispatch mechanism offers, and unknown types stay visible.
7. The decision sentence names the mechanisms you put in the plan.

The tests check structure and coherence, not your wording.
