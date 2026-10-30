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
  if (typeof node === 'function') {
    throw new Error(`Functions cannot be passed directly to Client Components: ${node.name || 'anonymous function'}`);
  }
  if (Array.isArray(node)) {
    return Promise.all(node.map(renderToPayload));
  }
  if (isValidElement(node)) {
    return renderElementToPayload(node);
  }
  return renderPropsToPayload(node);
}

async function renderPropsToPayload(props) {
  const entries = await Promise.all(Object.entries(props).map(async ([name, value]) => [name, await renderToPayload(value)]));
  return Object.fromEntries(entries);
}

async function renderElementToPayload({ type, key, props }) {
  if (type === Fragment) {
    return renderToPayload(props.children);
  }
  if (typeof type === 'string') {
    return { $element: type, key, props: await renderPropsToPayload(props) };
  }
  if (type.$$client) {
    return { $client: type.$$client, key, props: await renderPropsToPayload(props) };
  }
  return renderToPayload(await type(props));
}

export function renderFromPayload(payload, components) {
  if (payload === null || typeof payload !== 'object') {
    return payload;
  }
  if (Array.isArray(payload)) {
    return payload.map((item) => renderFromPayload(item, components));
  }
  if ('$element' in payload) {
    return createElementFromPayload(payload.$element, payload, components);
  }
  if ('$client' in payload) {
    const Component = components[payload.$client];
    if (!Component) {
      throw new Error(`Client component "${payload.$client}" is missing from the client components`);
    }
    return createElementFromPayload(Component, payload, components);
  }
  return Object.fromEntries(Object.entries(payload).map(([name, value]) => [name, renderFromPayload(value, components)]));
}

function createElementFromPayload(type, { key, props }, components) {
  const { children, ...otherProps } = renderFromPayload(props, components);
  const elementProps = key === null ? otherProps : { ...otherProps, key };
  if (children === undefined) {
    return createElement(type, elementProps);
  }
  return Array.isArray(children) ? createElement(type, elementProps, ...children) : createElement(type, elementProps, children);
}
