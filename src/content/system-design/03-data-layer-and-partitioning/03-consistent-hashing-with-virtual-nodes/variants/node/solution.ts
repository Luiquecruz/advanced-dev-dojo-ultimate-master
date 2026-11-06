export function hash32(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

export interface HashRing {
  addNode(name: string): void;
  removeNode(name: string): void;
  nodeFor(key: string): string | undefined;
  nodesFor(key: string, count: number): string[];
}

interface VirtualNode {
  position: number;
  node: string;
}

export function createHashRing(options: { virtualNodes: number }): HashRing {
  const members = new Set<string>();
  let ring: VirtualNode[] = [];

  function firstIndexAtOrAfter(position: number): number {
    let low = 0;
    let high = ring.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (ring[middle].position < position) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    return low === ring.length ? 0 : low;
  }

  function addNode(name: string): void {
    if (members.has(name)) {
      return;
    }
    members.add(name);
    for (let index = 0; index < options.virtualNodes; index++) {
      ring.push({ position: hash32(`${name}#${index}`), node: name });
    }
    ring.sort((left, right) => left.position - right.position);
  }

  function removeNode(name: string): void {
    if (!members.delete(name)) {
      return;
    }
    ring = ring.filter((virtualNode) => virtualNode.node !== name);
  }

  function nodeFor(key: string): string | undefined {
    if (ring.length === 0) {
      return undefined;
    }
    return ring[firstIndexAtOrAfter(hash32(key))].node;
  }

  function nodesFor(key: string, count: number): string[] {
    const replicas: string[] = [];
    if (ring.length === 0) {
      return replicas;
    }
    const wanted = Math.min(count, members.size);
    const start = firstIndexAtOrAfter(hash32(key));
    for (let step = 0; step < ring.length && replicas.length < wanted; step++) {
      const node = ring[(start + step) % ring.length].node;
      if (!replicas.includes(node)) {
        replicas.push(node);
      }
    }
    return replicas;
  }

  return { addNode, removeNode, nodeFor, nodesFor };
}

const ring = createHashRing({ virtualNodes: 100 });
['cache-a', 'cache-b', 'cache-c'].forEach((name) => ring.addNode(name));
console.log(ring.nodeFor('user:42'), ring.nodesFor('user:42', 2));
