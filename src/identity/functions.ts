import { makeFunctionReference } from "convex/server";
import { deepFreeze } from "../immutable.js";

import type { SuitePlanId } from "./catalog.js";
import type { SuiteInvoiceRef } from "./identifiers.js";
import type { SuiteReturnTarget } from "./return-targets.js";
import type { SuiteAccountView } from "./views.js";

export type { SuiteReturnTarget } from "./return-targets.js";

export type StartSuiteCheckoutArgs = {
  readonly plan: SuitePlanId;
  readonly returnTarget: SuiteReturnTarget;
};
export type StartSuiteCheckoutResult =
  | { readonly kind: "account" }
  | { readonly kind: "redirect"; readonly url: string };

export type CreateSuitePortalSessionArgs = {
  readonly returnTarget: SuiteReturnTarget;
};
export type CreateSuitePortalSessionResult = {
  readonly kind: "redirect";
  readonly url: string;
};

export type OpenSuiteInvoiceArgs = {
  readonly invoiceRef: SuiteInvoiceRef;
};
export type OpenSuiteInvoiceResult = {
  readonly kind: "redirect";
  readonly url: string;
};

/** Query the currently authenticated suite account and its safe projections. */
export const accountsCurrent = makeFunctionReference<
  "query",
  Record<never, never>,
  SuiteAccountView | null
>("accounts:current");

/** Start hosted Checkout for one exact suite plan. Return URLs are server-owned. */
export const billingStartCheckout = makeFunctionReference<
  "action",
  StartSuiteCheckoutArgs,
  StartSuiteCheckoutResult
>("billing:startCheckout");

/** Open the current account's hosted Customer Portal. Its return URL is server-owned. */
export const billingCreatePortalSession = makeFunctionReference<
  "action",
  CreateSuitePortalSessionArgs,
  CreateSuitePortalSessionResult
>("billing:createPortalSession");

/** Resolve one owned invoice reference to a validated hosted invoice URL. */
export const billingOpenInvoice = makeFunctionReference<
  "action",
  OpenSuiteInvoiceArgs,
  OpenSuiteInvoiceResult
>("billing:openInvoice");

export const suiteAccountsApi = deepFreeze({
  accounts: { current: accountsCurrent },
  billing: {
    createPortalSession: billingCreatePortalSession,
    openInvoice: billingOpenInvoice,
    startCheckout: billingStartCheckout,
  },
} as const);
