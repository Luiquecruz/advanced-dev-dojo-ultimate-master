1. Add `@submit.prevent="submit"` to the form so the browser does not navigate.
2. Add `@click="cardClicks++"` to the card and `@click.stop="likes++"` to the Like button so the event does not bubble.
3. Add `@click.once="bonus += 10"` to the bonus button.
4. Implement `addTag` by reading the input from `event.target`, pushing the trimmed text and clearing the field.
5. Register `addTag` on the input with a `.enter` key modifier.
