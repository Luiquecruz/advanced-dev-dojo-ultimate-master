Write the rendering ADR for **Encore**, a concert ticketing site.

## Briefing

- Four frontend developers, hosting with a CDN in front of a server that can render React. Per-request rendering is billed per invocation and the budget is tight.
- Organic search brings 60% of ticket buyers. Link previews on social media drive the rest.
- While an event is on sale, prices and remaining ticket tiers change several times an hour. Organizers edit event descriptions in a CMS that can call a webhook on publish.
- On-sale moments create traffic spikes of 50× the normal load on event pages.

| Path | Content | SEO-critical | Data changes | Same HTML for every visitor |
| --- | --- | --- | --- | --- |
| `/` | landing page with featured tours, edited by marketing in the repository | yes | on deploy | yes |
| `/events/:slug` | lineup, venue, remaining ticket tiers and prices | yes | several times an hour | yes |
| `/events/:slug/checkout` | seat selection and payment, after login | no | every request | no |
| `/account/tickets` | the buyer's tickets and QR codes, after login | no | every request | no |
| `/help/:article` | help center articles written in Markdown in the repository | yes | on deploy | yes |

## Task

In `adr.js`, export two constants.

**`adr`**, the record:

- `id`: a positive integer.
- `title`: at least 10 characters.
- `status`: `'accepted'`.
- `layer`: `'rendering'`.
- `context`: at least 80 characters, mentions `SEO` and how fresh the data must be (contains one of `fresh`, `stale` or `chang`).
- `decision`: at least 40 characters, starts with `We will`.
- `alternatives`: at least two `{ option, reason }` objects with distinct `option` texts (at least 3 characters) and a `reason` of at least 20 characters explaining why it was rejected.
- `consequences`: `{ positive: [...], negative: [...] }`, each with at least one item of at least 15 characters.

**`routes`**, the per-route map: exactly one `{ path, model, reason }` per briefing path, where `model` is one of `'static'`, `'ssg'`, `'isr'`, `'ssr'`, `'spa'` and `reason` has at least 15 characters.

The map must be coherent with the briefing:

1. An SEO-critical route is never `'spa'`.
2. A route with per-visitor HTML or data that changes on every request is never `'static'`, `'ssg'` or `'isr'`.
3. A route whose data changes during the day is never `'static'` or `'ssg'`.
4. A route whose content only changes on deploy is never `'ssr'`.

The tests check structure and coherence, not your wording.
