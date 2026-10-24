import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useProductsStore, type Product } from './products';

export const useCartStore = defineStore('cart', () => {
  const productsStore = useProductsStore();
  const ids = ref<number[]>([]);

  const items = computed(() => ids.value.map((id) => productsStore.byId(id)).filter((product): product is Product => product !== undefined));
  const total = computed(() => items.value.reduce((sum, product) => sum + product.price, 0));

  function add(id: number) {
    ids.value.push(id);
  }

  function $reset() {
    ids.value = [];
  }

  return { ids, items, total, add, $reset };
});
