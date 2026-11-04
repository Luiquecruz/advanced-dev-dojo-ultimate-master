Implement permission reports and de-duplication helpers in `main.py`.

## `access_report(roles, user_roles, needed)`

`roles` maps a role name to a **set** of permissions. `user_roles` is a list of role names the user holds and `needed` is a set of permissions the user must have. Return a dict of four **sets**:

- `"granted"`: the union of the permissions of the user's roles.
- `"common"`: the permissions shared by **all** the user's roles (empty when the user has no roles).
- `"missing"`: permissions in `needed` that are not granted.
- `"unused"`: granted permissions that are not in `needed`.

The inputs are never modified, and the returned sets are new objects: adding to `report["granted"]` must not change a set inside `roles`, even when the user has a single role. An unknown role raises `KeyError`.

## `dedupe_keep_order(items)`

Return a list without duplicates, keeping the first occurrence of each item. Unhashable items raise `TypeError`.

## `unique_ids(*iterables)`

Return a set with every item of every iterable, including generators.
