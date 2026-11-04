Write the ADR and the plan for the **event-payload store** shared by four services.

## Briefing

Four services in one Python process share an in-memory store of webhook payloads. Each payload is identified by a `tenant` and an `event_id`. Event ids are unique only inside a tenant: `("acme", "evt-42")` and `("globex", "evt-42")` are different events, and nothing stops a tenant id from looking exactly like an event id.

- **Volume:** the store holds about **2 million** payloads and serves **12 million lookups per minute** by `(tenant, event_id)`. The lookup path can afford at most **100 million key comparisons per second**.
- **Repeats:** providers retry, so about **5%** of the 600 000 events arriving per minute are duplicates of an event already stored. The first arrival wins.
- **Order:** an audit service replays payloads **in arrival order**, and three services exchange them as JSON arrays in that order.
- **Headers:** each payload carries HTTP headers. Providers send `Content-Type`, `content-type` and `CONTENT-TYPE` for the same header, and last week two spellings were stored as two entries and a signature check read the wrong one.
- **Memory:** the budget is **4 GB** (4 × 10⁹ bytes) for the 2 million payloads. An average payload with its headers takes about **1 500 bytes**; anything kept per payload in a second structure (a replay list holding its own copy) costs that again.

## Task

In `adr.py`, define two constants.

**`ADR`**, the record:

- `id`: a positive integer; `title`: at least 10 characters; `status`: `"accepted"`.
- `context`: at least 80 characters; mentions the `tenant` part of the key and the `header` bug.
- `decision`: at least 40 characters, starts with `We will`, and names the key type you chose (`tuple` or `str`).
- `alternatives`: at least two `{"option", "reason"}` with distinct options (at least 3 characters) and reasons of at least 20 characters.
- `consequences`: `{"positive": [...], "negative": [...]}`, each with at least one item of at least 15 characters.

**`PLAN`**, the design:

- `lookups_per_second`: a number, the lookup rate the store must serve. Compute it from the briefing.
- `bytes_per_payload_budget`: a number, the memory budget available per stored payload, in bytes. Compute it from the briefing.
- `lookup_container`: `"dict"`, `"set"` or `"list"`.
- `key_type`: `"str"`, `"tuple"` or `"frozenset"`.
- `ordering`: `"insertion"`, `"sorted"` or `"none"`.
- `replay_source`: where the audit replay reads the order from: `"dict_order"` (the store itself), `"separate_list"` (a second list of payload copies) or `"sorted_copy"`.
- `dedupe`: `"set"`, `"dict.fromkeys"` or `"sort_unique"`.
- `headers`: `"CaseInsensitiveDict"`, `"lower_on_write"` or `"dict"`.
- `protocol`: `"mapping"`, `"sequence"` or `"custom_class"`.
- `rejected`: at least two `{"pattern", "reason"}` with distinct patterns (at least 3 characters) and reasons of at least 20 characters.

The plan must be coherent with the briefing. The tests check these relationships, so reason from the facts rather than from the field names:

1. A lookup must return the payload for a key. A container that scans would compare, on average, half of the 2 million payloads per lookup: at your `lookups_per_second` that must fit the comparison budget, or the container is ruled out. Callers use the store through the protocol that matches keyed access.
2. The key must be hashable and must keep two different events apart, including the collisions described in the briefing.
3. If keeping a second copy of every payload would exceed your `bytes_per_payload_budget`, the replay order must come from the store itself, and the store's ordering and de-duplication must both preserve arrival order.
4. Header names must behave case-insensitively wherever they are stored.
5. The decision sentence names the key type you put in the plan.

The tests check structure and coherence, not your wording.
