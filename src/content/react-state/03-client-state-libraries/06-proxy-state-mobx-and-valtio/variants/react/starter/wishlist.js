import { proxy } from 'valtio';

export function createWishlist() {
  return proxy({ ids: [] });
}

export function toggleSaved(wishlist, id) {
  const index = wishlist.ids.indexOf(id);
  if (index === -1) {
    wishlist.ids.push(id);
  } else {
    wishlist.ids.splice(index, 1);
  }
}
