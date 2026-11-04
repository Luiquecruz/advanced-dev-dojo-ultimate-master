1. Decide for each helper whether the result is a new container (`invert`, `group_by`, `shared_keys`) or a live view (`live_keys`).
2. `invert`: loop over `items()`, adding each key to the set stored under its value.
3. `group_by`: loop over the items, appending to the list stored under the computed key.
4. `shared_keys`: intersect the two keys views with `&`.
5. `live_keys`: return the view without copying, then confirm that adding a key to the dict changes the view.
