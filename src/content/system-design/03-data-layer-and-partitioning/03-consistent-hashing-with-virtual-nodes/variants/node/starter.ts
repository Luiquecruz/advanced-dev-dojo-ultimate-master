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

export function createHashRing(options: { virtualNodes: number }): HashRing {
  const nodes: string[] = [];

  return {
    addNode(name) {
      // TODO: place options.virtualNodes positions at hash32(`${name}#${index}`), kept sorted by position
      if (!nodes.includes(name)) {
        nodes.push(name);
      }
    },
    removeNode(name) {
      // TODO: remove every virtual node of this physical node
      const index = nodes.indexOf(name);
      if (index !== -1) {
        nodes.splice(index, 1);
      }
    },
    nodeFor(key) {
      // TODO: replace the modulo with the first virtual node clockwise (binary search, wrapping)
      if (nodes.length === 0) {
        return undefined;
      }
      return nodes[hash32(key) % nodes.length];
    },
    nodesFor(key, count) {
      // TODO: walk clockwise and collect `count` distinct physical nodes
      const first = this.nodeFor(key);
      return first === undefined || count < 1 ? [] : [first];
    },
  };
}

const ring = createHashRing({ virtualNodes: 100 });
['cache-a', 'cache-b', 'cache-c'].forEach((name) => ring.addNode(name));
console.log(ring.nodeFor('user:42'), ring.nodesFor('user:42', 2));
