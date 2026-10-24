Real data is nested: an order has a customer, the customer has an address, the order has many lines. Build
these types **bottom-up** from small named pieces instead of one giant literal:

```ts
interface Track { title: string; durationInSeconds: number }

interface Album {
  title: string;
  artist: { name: string; country: string };   // inline nested object
  tracks: Track[];                             // array of objects
}
```

Indexed access types let you reach into nested shapes without redeclaring them:

```ts
type Artist = Album['artist'];          // { name: string; country: string }
type FirstTrack = Album['tracks'][number]; // Track
```

Array methods keep their element types, so `map`, `filter` and `reduce` over `Track[]` are fully typed:

```ts
const totalSeconds = album.tracks.reduce((sum, track) => sum + track.durationInSeconds, 0);
```

Pitfalls: forgetting the initial value in `reduce` (the accumulator then becomes the element type), and
returning a `Set` where an array is expected. Convert with `[...new Set(values)]`.
