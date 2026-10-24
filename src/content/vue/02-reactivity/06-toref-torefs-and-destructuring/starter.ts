import { computed, reactive, toRef, toRefs, toValue, type MaybeRefOrGetter } from 'vue';

export function useCart() {
  const state = reactive({ items: [] as string[], coupon: '' });

  // TODO: build itemCount with toRef(() => ...)
  const itemCount = state.items.length;

  const summary = computed(() => `${state.items.length} items${state.coupon ? ` with ${state.coupon}` : ''}`);

  function add(item: string) {
    state.items.push(item);
  }

  // TODO: return the state fields as linked refs
  return { items: state.items, coupon: state.coupon, itemCount, summary, add };
}

export function useLength(source: MaybeRefOrGetter<string>) {
  // TODO: normalize the source with toValue inside a computed
  return computed(() => String(source).length);
}
