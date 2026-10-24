Modifiers go after the event name: `@submit.prevent="submit"`, `@click.stop="..."`, `@click.once="..."`.
---
Only the inner `Like` button needs `.stop`; the outer `.card` gets a plain `@click="cardClicks++"`.
---
In `addTag`, cast the target: `const input = event.target as HTMLInputElement`. Push `input.value.trim()` into `tags.value`, then set `input.value = ''`. Register it with `@keyup.enter="addTag"`.
