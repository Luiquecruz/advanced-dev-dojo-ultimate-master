Wrap each component in its own block: `@defer (...) { <app-reviews /> } @placeholder { ... }`. The sub-blocks follow the closing brace directly.
---
Reference the button by its template variable: `@defer (on interaction(reviewsTrigger); prefetch on idle)`.
---
Loading with a minimum duration: `@loading (minimum 200ms) { <p>Loading reviews...</p> }`, then `@error { <p>Could not load reviews.</p> }`.
---
The second block: `@defer (on idle) { <app-recommendations /> } @placeholder { <p>Recommendations coming soon</p> }`.
