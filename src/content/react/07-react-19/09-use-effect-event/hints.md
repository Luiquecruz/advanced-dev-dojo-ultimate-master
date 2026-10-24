The connection depends on `roomId`; the theme is only *read* when the `'connected'` event fires. That second part is an Effect Event.
---
`const onConnected = useEffectEvent((connectedRoomId) => { setStatus(...) });` reads the latest `theme` every time it is called.
---
Inside the effect call `onConnected(roomId)` from the `'connected'` handler, then change the dependency array to `[roomId]`. Do not list `onConnected` as a dependency.
