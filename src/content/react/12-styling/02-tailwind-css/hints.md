Write every tone as a full string inside an object: `{ success: 'bg-green-100 text-green-800 ...', ... }`. The scanner needs to find complete class names in your source.
---
Combine the base string with the tone using `clsx(base, tones[status])` or a template string that only joins two variables: `` `${base} ${tones[status]}` ``.
---
For the card, `md:p-6` is just another class in the string: `"rounded-xl border border-gray-200 p-4 shadow-sm md:p-6"`.
