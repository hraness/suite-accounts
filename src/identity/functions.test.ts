import { expect, test } from "bun:test";
import {
  getFunctionName,
  type FunctionReference,
} from "convex/server";

import {
  accountsCurrent,
  billingCreatePortalSession,
  billingOpenInvoice,
  billingStartCheckout,
  suiteAccountsApi,
  type CreateSuitePortalSessionArgs,
  type CreateSuitePortalSessionResult,
  type OpenSuiteInvoiceArgs,
  type OpenSuiteInvoiceResult,
  type StartSuiteCheckoutArgs,
  type StartSuiteCheckoutResult,
} from "./functions";
import type { SuiteAccountView } from "./views";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
    <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;
type ArgsOf<Reference> =
  Reference extends FunctionReference<
    "query" | "mutation" | "action",
    "public" | "internal",
    infer Args,
    unknown
  >
    ? Args
    : never;
type ResultOf<Reference> =
  Reference extends FunctionReference<
    "query" | "mutation" | "action",
    "public" | "internal",
    Record<string, unknown>,
    infer Result
  >
    ? Result
    : never;

type AccountsArgsMatch = Expect<
  Equal<ArgsOf<typeof accountsCurrent>, Record<never, never>>
>;
type AccountsResultMatches = Expect<
  Equal<ResultOf<typeof accountsCurrent>, SuiteAccountView | null>
>;
type CheckoutArgsMatch = Expect<
  Equal<ArgsOf<typeof billingStartCheckout>, StartSuiteCheckoutArgs>
>;
type CheckoutResultMatches = Expect<
  Equal<ResultOf<typeof billingStartCheckout>, StartSuiteCheckoutResult>
>;
type PortalArgsMatch = Expect<
  Equal<ArgsOf<typeof billingCreatePortalSession>, CreateSuitePortalSessionArgs>
>;
type PortalResultMatches = Expect<
  Equal<
    ResultOf<typeof billingCreatePortalSession>,
    CreateSuitePortalSessionResult
  >
>;
type InvoiceArgsMatch = Expect<
  Equal<ArgsOf<typeof billingOpenInvoice>, OpenSuiteInvoiceArgs>
>;
type InvoiceResultMatches = Expect<
  Equal<ResultOf<typeof billingOpenInvoice>, OpenSuiteInvoiceResult>
>;
const signatureChecks: readonly [
  AccountsArgsMatch,
  AccountsResultMatches,
  CheckoutArgsMatch,
  CheckoutResultMatches,
  PortalArgsMatch,
  PortalResultMatches,
  InvoiceArgsMatch,
  InvoiceResultMatches,
] = [true, true, true, true, true, true, true, true];

test("exports stable string-named account-service references", () => {
  expect(signatureChecks).toHaveLength(8);
  expect(getFunctionName(accountsCurrent)).toBe("accounts:current");
  expect(getFunctionName(billingStartCheckout)).toBe("billing:startCheckout");
  expect(getFunctionName(billingCreatePortalSession)).toBe(
    "billing:createPortalSession",
  );
  expect(getFunctionName(billingOpenInvoice)).toBe("billing:openInvoice");
  expect(Object.isFrozen(suiteAccountsApi)).toBe(true);
  expect(Object.isFrozen(suiteAccountsApi.billing)).toBe(true);
  expect(Reflect.set(suiteAccountsApi.billing, "startCheckout", null)).toBe(
    false,
  );
  expect(getFunctionName(suiteAccountsApi.billing.startCheckout)).toBe(
    "billing:startCheckout",
  );
});
