1. In `formatId`, check `typeof id === 'number'` and pad its string form; the remaining branch is a string, so trim and uppercase it.
2. In `normalizeTags`, turn both shapes into one array: split strings by commas, keep arrays as they are.
3. Trim every tag and filter out empty strings in a single pipeline that works for both shapes.
4. In `totalQuantity`, reduce from `0`, converting each element that is not already a number.
