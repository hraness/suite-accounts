// src/identity/return-targets.ts
import { err, ok } from "@hraness/result";

// src/immutable.ts
function deepFreeze(value) {
  const visited = new WeakSet;
  function freezeOwned(current) {
    if (current === null || typeof current !== "object")
      return;
    if (visited.has(current))
      return;
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

// src/identity/return-targets.ts
var SUITE_RETURN_TARGETS = deepFreeze(["accounts"]);
function parseSuiteReturnTarget(value) {
  return value === "accounts" ? ok(value) : err("invalid-return-target");
}
export {
  parseSuiteReturnTarget,
  SUITE_RETURN_TARGETS
};
