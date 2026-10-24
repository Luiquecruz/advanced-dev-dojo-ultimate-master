import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useProductsStore, type Product } from './products';

export const useCartStore = defineStore('cart', () => {
  // TODO: get the products store here, inside the setup function
  const ids = ref<number[]>([]);

  // TODO: items — map each id to its product with the products store's byId getter
  const items = computed<Product[]>(() => []);
  // TODO: total — sum of the items' prices
  const total = computed(() => 0);

  function add(id: number) {
    ids.value.push(id);
  }

  function $reset() {
    ids.value = [];
  }

  return { ids, items, total, add, $reset };
});
