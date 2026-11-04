1. Write `send = rate_limit(2, 10, clock)(send)` on paper and name what each call returns. The three levels map to settings, function and call.
2. Place each piece of state at the right level: settings in the factory, the timestamp window in the decorator, `now` in the wrapper.
3. Define the window boundary precisely (a call made exactly `period` seconds ago no longer counts) and trace the fake-clock sequence 0, 4, 10, 13, 14.
4. For `retry`, list the outcomes of one attempt: success returns, a listed exception tries again or re-raises on the last attempt, any other exception escapes at once.
5. Make the bare form work last: detect whether `retry` received a function or only keywords, and keep the settings keyword-only so the two cases cannot be confused.
