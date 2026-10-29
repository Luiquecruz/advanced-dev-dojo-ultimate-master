1. Identify what is wrong with the starter: SHA-256 is designed to be fast (billions of guesses per second on a GPU) and has no salt, so equal passwords produce equal hashes and precomputed tables work.
2. Add a random salt per password and a deliberately slow key derivation function; store everything needed to verify later (algorithm, cost, salt, hash) in one self-describing string.
3. Verification never "decrypts": it repeats the derivation with the stored parameters and compares results. Reading the cost from the stored value is what allows old hashes to keep working after you raise the policy.
4. Compare with `timingSafeEqual` so the time taken does not reveal how many leading bytes matched.
5. Treat stored values as untrusted input: malformed strings return `false` instead of crashing the login endpoint.
6. Upgrade on login: the only moment you have the plaintext password is a successful login, so that is when a weaker hash is replaced with one at the current cost.
