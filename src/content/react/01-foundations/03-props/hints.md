Props arrive as one object. Destructure what you need in the parameter list: `function Avatar({ name, imageUrl, size })`.
---
A default parameter value works inside destructuring too: `{ size = 64 }`. Then use `width={size}` and `height={size}`.
---
Inside `Profile`, pass the props down: `<Avatar name={name} imageUrl={imageUrl} size={96} />`. In `TeamPage`, string props can use quotes: `<Profile name="Ada Lovelace" role="Mathematician" imageUrl="/avatars/ada.png" />`.
