/**
 * Freeze an owned JSON-like value recursively before it crosses a public
 * security boundary. This helper intentionally does not traverse functions or
 * collection classes. Registry and configuration values use only plain
 * records and arrays.
 */
export function deepFreeze<const Value>(value: Value): Value {
  const visited = new WeakSet<object>();

  function freezeOwned(current: unknown): void {
    if (current === null || typeof current !== "object") return;
    if (visited.has(current)) return;
    visited.add(current);
    for (const key of Reflect.ownKeys(current)) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (descriptor !== undefined && "value" in descriptor) {
        freezeOwned(descriptor.value);
      }
    }
    Object.freeze(current);
  }

  freezeOwned(value);
  return value;
}
