1. Notice that both limiters only need to be correct at the moment someone asks, so state can be brought up to date lazily from the elapsed time instead of with timers.
2. For the token bucket, store the token count and the time of the last update; every call first converts the elapsed time into tokens, and the capacity cap is what bounds the size of a burst.
3. Make `TryRemove` all-or-nothing: a request for more tokens than are available must leave the bucket unchanged.
4. For the sliding window counter, think of the last `windowMs` milliseconds as a sliding frame that overlaps the previous fixed window by `windowMs - elapsed`; that overlap ratio is the weight of the previous count.
5. Handle window transitions explicitly: an adjacent window passes its count on, a gap of one or more idle windows passes nothing, and only accepted requests are counted, so rejected retries cannot lock a client out for longer.
