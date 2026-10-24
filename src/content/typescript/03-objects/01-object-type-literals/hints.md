Inside the type alias, mark the optional property with `?` right after its name.
---
Build the street part first: use the complement only when it is present, then append `, city postalCode`.
---
A ternary works well: `const streetLine = address.complement ? `${address.street} (${address.complement})` : address.street;`
