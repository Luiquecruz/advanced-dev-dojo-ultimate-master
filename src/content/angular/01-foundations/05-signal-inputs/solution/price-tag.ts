import { Component, booleanAttribute, computed, input, numberAttribute } from '@angular/core';

@Component({
  selector: 'app-price-tag',
  host: { '[class.highlighted]': 'highlighted()' },
  template: `
    <h3>{{ label() }}</h3>
    <p class="price">{{ currency() }} {{ finalPrice().toFixed(2) }}</p>
    @if (discount() > 0) {
      <s class="original">{{ currency() }} {{ amount().toFixed(2) }}</s>
    }
  `,
})
export class PriceTag {
  readonly label = input.required<string>();
  readonly amount = input.required<number>();
  readonly currency = input('USD');
  readonly discount = input(0, { transform: numberAttribute });
  readonly highlighted = input(false, { transform: booleanAttribute });

  protected readonly finalPrice = computed(() => this.amount() * (1 - this.discount() / 100));
}
