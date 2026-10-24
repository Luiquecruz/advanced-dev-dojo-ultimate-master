Put `v-if` on the first `<p>`, then `v-else-if` and `v-else` on the paragraphs right after it. Each branch compares `status` to a string.
---
The chain only works when the elements are adjacent siblings. Do not put other elements between them.
---
`v-show="showHelp"` on the `<aside>` keeps it rendered and toggles `display: none`, which is exactly what the last test checks.
