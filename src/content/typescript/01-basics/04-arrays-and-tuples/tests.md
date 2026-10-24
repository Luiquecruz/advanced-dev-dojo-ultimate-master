## type: ScoreEntry is a [string, number] tuple

```ts
type _length = Expect<Equal<ScoreEntry['length'], 2>>;
type _player = Expect<Equal<ScoreEntry[0], string>>;
type _score = Expect<Equal<ScoreEntry[1], number>>;
```

## runtime: parseScore splits the player and converts the score

```js
assert.deepEqual(parseScore('ada:42'), ['ada', 42]); assert.deepEqual(parseScore('grace:0'), ['grace', 0]);
```

## type: topPlayers accepts readonly arrays

```ts
const frozen: readonly ScoreEntry[] = [['ada', 1]];
topPlayers(frozen, 1);
type _ = Expect<Equal<Parameters<typeof topPlayers>[0], readonly ScoreEntry[]>>;
```

## runtime: topPlayers returns the best players first

```js
const entries = [['ada', 42], ['alan', 99], ['grace', 70], ['linus', 10]]; assert.deepEqual(topPlayers(entries, 2), ['alan', 'grace']); assert.deepEqual(topPlayers(entries, 10), ['alan', 'grace', 'ada', 'linus']);
```

## runtime: topPlayers does not mutate its input

```js
const entries = [['ada', 42], ['alan', 99]]; topPlayers(entries, 1); assert.deepEqual(entries, [['ada', 42], ['alan', 99]]);
```
