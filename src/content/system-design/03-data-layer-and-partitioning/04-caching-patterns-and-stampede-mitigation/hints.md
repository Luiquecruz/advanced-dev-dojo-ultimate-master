Keep a second map next to the entries: `inFlight: Map<string, Promise<V>>`. On a miss, return `inFlight.get(key)` when it exists; otherwise start the load, store its promise in the map and return it. Because the map is updated synchronously, the 99 calls that arrive before the load finishes all find the same promise.
---
Do not make `get` an `async` function that awaits the load: build the promise with `.then(onValue, onError)` and return that same promise. In `onValue`, compute the expiry with `options.now() + options.ttlMs + Math.floor(options.random() * options.jitterMs)` and store the entry; in `onError`, store nothing and rethrow. Both remove the key from `inFlight`.
---
For `invalidate`, delete the key from both maps. To make sure a forgotten load neither stores its result nor removes a newer in-flight load, check in `onValue` and `onError` that `inFlight.get(key)` is still the promise that is settling before touching the maps.
