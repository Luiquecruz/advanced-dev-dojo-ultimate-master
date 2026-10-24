import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export interface Product {
  id: number;
  name: string;
  price: number;
}

export const useProductsStore = defineStore('products', () => {
  const products = ref<Product[]>([
    { id: 1, name: 'Keyboard', price: 120 },
    { id: 2, name: 'Mouse', price: 45 },
    { id: 3, name: 'Monitor', price: 340 },
  ]);

  const byId = computed(() => (id: number) => products.value.find((product) => product.id === id));

  function setPrice(id: number, price: number) {
    const product = products.value.find((entry) => entry.id === id);
    if (product) {
      product.price = price;
    }
  }

  return { products, byId, setPrice };
});
