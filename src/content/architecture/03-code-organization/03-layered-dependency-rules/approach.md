1. Reduce every path to the three facts the rules need: layer, slice (or none) and the rest of the path inside the slice. `describeFile` already does it.
2. Judge each import as an edge between two described files, independently of the others. That makes the checker a pure `edge → rule | null` function plus a loop.
3. Check the rules from the most severe to the least: direction first (a wrong direction is wrong at any depth), then siblings, then the public API. Returning at the first match guarantees one violation per import.
4. Allow unsliced targets before looking at slices: `shared` may be imported at any depth, and `app` only reaches the direction check.
5. Same layer means same slice or sibling; different layers below mean "is it the index file?".
6. Sort the result deterministically so an architecture test produces stable, diffable output in CI.
