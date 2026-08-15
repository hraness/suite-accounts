// src/identity/functions.ts
import { makeFunctionReference } from "convex/server";

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

// src/identity/functions.ts
var accountsCurrent = makeFunctionReference("accounts:current");
var billingStartCheckout = makeFunctionReference("billing:startCheckout");
var billingCreatePortalSession = makeFunctionReference("billing:createPortalSession");
var billingOpenInvoice = makeFunctionReference("billing:openInvoice");
var suiteAccountsApi = deepFreeze({
  accounts: { current: accountsCurrent },
  billing: {
    createPortalSession: billingCreatePortalSession,
    openInvoice: billingOpenInvoice,
    startCheckout: billingStartCheckout
  }
});
export {
  suiteAccountsApi,
  billingStartCheckout,
  billingOpenInvoice,
  billingCreatePortalSession,
  accountsCurrent
};
