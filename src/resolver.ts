/**
 * Key resolution helpers.
 *
 * These are pure functions on purpose: the same semantics are exercised by the
 * Node suite and the browser pages, so a regression cannot hide in one build.
 */

export interface ResolveResult {
  found: boolean;
  value?: unknown;
}

/**
 * Own-property check used for every path segment.
 *
 * `Object.hasOwn` is ES2022 and the bundles target ES2018, so the prototype
 * method is called explicitly. It also keeps `Object.create(null)` message
 * trees working, and it stops `constructor` / `toString` / `__proto__` from
 * resolving through the prototype chain.
 */
export function hasOwn(target: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(target, key);
}

/** True for plain objects only: `null` and arrays are rejected. */
export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Walk a dot path of any depth.
 *
 * A missing segment, a non-object in the middle of the path, or an `undefined`
 * leaf all report `found: false`. Falsy leaves (`0`, `false`, `''`) are found
 * values and must be returned as-is.
 */
export function resolveKey(tree: unknown, key: string): ResolveResult {
  if (!isPlainRecord(tree)) {
    return { found: false };
  }

  let node: unknown = tree;
  for (const segment of key.split('.')) {
    if (!isPlainRecord(node) || !hasOwn(node, segment)) {
      return { found: false };
    }
    node = node[segment];
  }

  if (node === undefined) {
    return { found: false };
  }
  return { found: true, value: node };
}
