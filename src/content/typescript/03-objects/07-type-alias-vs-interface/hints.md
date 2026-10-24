Unions and tuples can only be written with `type`.
---
Destructure the toggle: `const [channel, enabled] = toggle;`.
---
Enable: `includes` check then `[...channels, channel]`. Disable: `channels.filter((existing) => existing !== channel)`.
