1. Change the `Avatar` signature to destructure `{ name, imageUrl, size = 64 }` and bind them to `src`, `alt`, `width` and `height`.
2. Make `Profile` destructure `{ name, role, imageUrl }`, render `<Avatar ... size={96} />`, then the `<h3>` and `<p>`.
3. In `TeamPage`, render two `<Profile />` elements with the data from the challenge, in order: Ada first, Grace second.
4. Check that numbers are passed with braces (`size={96}`), not quotes.
