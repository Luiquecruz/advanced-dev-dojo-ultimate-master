import { computed, reactive, toRef, toRefs, toValue, type MaybeRefOrGetter } from 'vue';

export function useCart() {
  const state = reactive({ items: [] as string[], coupon: '' });

  const itemCount = toRef(() => state.items.length);

  const summary = computed(() => `${state.items.length} items${state.coupon ? ` with ${state.coupon}` : ''}`);

  function add(item: string) {
    state.items.push(item);
  }

  return { ...toRefs(state), itemCount, summary, add };
}

export function useLength(source: MaybeRefOrGetter<string>) {
  return computed(() => toValue(source).length);
}
