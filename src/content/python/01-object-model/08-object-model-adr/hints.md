Start from the symptom: a `list` field that every service can append to. Which design makes that impossible, instead of merely discouraged? Then ask what the cache needs from a key, and whether that promise can hold while a mutable collection sits inside the object.
---
Do the arithmetic before choosing a policy: reads per request times the cost of one deep copy, converted from microseconds to milliseconds. Compare the result with the latency budget, then compare it with the cost of two writes a day.
---
`None` and `0` are both valid values, so neither truthiness nor `is None` can mean "not provided". Which kind of marker can no caller ever pass by accident? Write each rejected option with the fact or the number from the briefing that rules it out.
