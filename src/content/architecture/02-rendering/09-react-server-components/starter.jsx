import { Fragment, createElement, isValidElement, useState } from 'react';

export function markAsClient(name, Component) {
  Component.$$client = name;
  return Component;
}

const database = {
  async findProduct(productId) {
    return {
      id: productId,
      name: 'Mechanical Keyboard',
      price: 120,
      costPrice: 61,
      specifications: ['Hot-swappable switches', 'USB-C', 'Aluminium case'],
    };
  },
};

export const AddToCart = markAsClient('AddToCart', function AddToCart({ productId, price }) {
  const [quantity, setQuantity] = useState(0);

  return (
    <div data-product-id={productId}>
      <button type="button" onClick={() => setQuantity(quantity + 1)}>
        Add to cart ({quantity})
      </button>
      <p>Total: ${quantity * price}</p>
    </div>
  );
});

export const Tabs = markAsClient('Tabs', function Tabs({ label, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        Show {label}
      </button>
      {open && <div role="region" aria-label={label}>{children}</div>}
    </div>
  );
});

export const clientComponents = { AddToCart, Tabs };

async function Specifications({ product }) {
  return (
    <ul>
      {product.specifications.map((specification) => (
        <li key={specification}>{specification}</li>
      ))}
    </ul>
  );
}

export async function ProductPage({ productId }) {
  const product = await database.findProduct(productId);

  return (
    <article>
      <h1>{product.name}</h1>
      <p>${product.price}</p>
      <AddToCart productId={product.id} price={product.price} />
      <Tabs label="Specifications">
        <Specifications product={product} />
      </Tabs>
    </article>
  );
}

export async function renderToPayload(node) {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return null;
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return node;
  }
  if (Array.isArray(node)) {
    return Promise.all(node.map(renderToPayload));
  }
  // TODO: a function anywhere in the payload throws "Functions cannot be passed directly to Client Components"
  // TODO: React elements: Fragment -> its children, host element -> { $element, key, props },
  //       client component ($$client) -> { $client, key, props } without calling it,
  //       server component -> call it (await it) and render what it returns
  // TODO: plain objects (props) -> the same keys with every value rendered to the payload
  return null;
}

export function renderFromPayload(payload, components) {
  if (payload === null || typeof payload !== 'object') {
    return payload;
  }
  if (Array.isArray(payload)) {
    return payload.map((item) => renderFromPayload(item, components));
  }
  // TODO: { $element } -> createElement(tag, props, ...children)
  // TODO: { $client } -> createElement(components[name], props, ...children); unknown name -> throw an Error with the name
  // TODO: plain objects -> the same keys with every value rebuilt
  return null;
}
