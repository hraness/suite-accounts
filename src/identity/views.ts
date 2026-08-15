import { err, isRecord, ok, type Result } from "@hraness/result";
import { deepFreeze } from "../immutable.js";

import {
  featuresForSuitePlan,
  parseSuiteCatalogRevision,
  parseCurrentSuiteFeatureId,
  parseSuitePlanId,
  SUITE_CATALOG_REVISION,
  type CurrentSuiteCatalogRevision,
  type CurrentSuiteFeatureId,
  type SuiteCatalogRevision,
  type SuitePlanId,
} from "./catalog.js";
import {
  parseSuiteAccountId,
  parseSuiteInvoiceRef,
  type SuiteAccountId,
  type SuiteInvoiceRef,
} from "./identifiers.js";
import {
  parseSuiteUsername,
  type SuiteUsername,
} from "./usernames.js";

export const SUITE_SUBSCRIPTION_STATUSES = deepFreeze([
  "incomplete",
  "trialing",
  "active",
  "past_due",
  "paused",
  "canceled",
  "unpaid",
] as const);
export const SUITE_INVOICE_STATUSES = deepFreeze([
  "draft",
  "open",
  "paid",
  "void",
  "uncollectible",
] as const);

export type SuiteSubscriptionStatus =
  (typeof SUITE_SUBSCRIPTION_STATUSES)[number];
export type SuiteInvoiceStatus = (typeof SUITE_INVOICE_STATUSES)[number];

export type SuiteSubscriptionView = {
  readonly cancelAtPeriodEnd: boolean;
  readonly catalogRevision: SuiteCatalogRevision;
  readonly currentPeriodEndMs: number | null;
  readonly plan: SuitePlanId;
  readonly status: SuiteSubscriptionStatus;
};

export type SuiteInvoiceView = {
  readonly amountDueCents: number;
  readonly amountPaidCents: number;
  readonly createdAtMs: number;
  readonly currency: "usd";
  readonly invoiceRef: SuiteInvoiceRef | null;
  readonly number: string | null;
  readonly status: SuiteInvoiceStatus;
};

export type SuiteAccountView = {
  readonly accountId: SuiteAccountId;
  readonly catalogRevision: CurrentSuiteCatalogRevision;
  readonly email: string;
  readonly features: CurrentSuiteFeatureId[];
  readonly invoices: SuiteInvoiceView[];
  readonly name: string | null;
  readonly plan: SuitePlanId | null;
  readonly subscription: SuiteSubscriptionView | null;
  readonly username: SuiteUsername | null;
};

export type SuiteViewIssue =
  | "invalid-account-view"
  | "invalid-invoice-view"
  | "invalid-subscription-view";

function containsAsciiControl(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

function parseEmail(value: unknown): string | null {
  return typeof value === "string" &&
      value.length <= 320 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)
    ? value
    : null;
}

function parseOptionalName(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === "string" &&
      value.length >= 1 &&
      value.length <= 160 &&
      value.trim() === value &&
      !containsAsciiControl(value)
    ? value
    : undefined;
}

function parseNonnegativeInteger(value: unknown): number | null {
  return typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= 0
    ? value
    : null;
}

function parseOptionalTimestamp(value: unknown): number | null | undefined {
  if (value === null) return null;
  return parseNonnegativeInteger(value) ?? undefined;
}

function isOneOf<const Values extends readonly string[]>(
  values: Values,
  value: unknown,
): value is Values[number] {
  return typeof value === "string" &&
    (values as readonly string[]).includes(value);
}

export function parseSuiteSubscriptionView(
  value: unknown,
): Result<SuiteSubscriptionView, "invalid-subscription-view"> {
  if (!isRecord(value)) return err("invalid-subscription-view");
  const plan = parseSuitePlanId(value["plan"]);
  const catalogRevision = parseSuiteCatalogRevision(value["catalogRevision"]);
  const currentPeriodEndMs = parseOptionalTimestamp(value["currentPeriodEndMs"]);
  if (
    !plan.ok ||
    !catalogRevision.ok ||
    !isOneOf(SUITE_SUBSCRIPTION_STATUSES, value["status"]) ||
    typeof value["cancelAtPeriodEnd"] !== "boolean" ||
    currentPeriodEndMs === undefined
  ) {
    return err("invalid-subscription-view");
  }
  return ok({
    cancelAtPeriodEnd: value["cancelAtPeriodEnd"],
    catalogRevision: catalogRevision.value,
    currentPeriodEndMs,
    plan: plan.value,
    status: value["status"],
  });
}

export function parseSuiteInvoiceView(
  value: unknown,
): Result<SuiteInvoiceView, "invalid-invoice-view"> {
  if (
    !isRecord(value) ||
    !isOneOf(SUITE_INVOICE_STATUSES, value["status"]) ||
    value["currency"] !== "usd"
  ) {
    return err("invalid-invoice-view");
  }
  const amountDueCents = parseNonnegativeInteger(value["amountDueCents"]);
  const amountPaidCents = parseNonnegativeInteger(value["amountPaidCents"]);
  const createdAtMs = parseNonnegativeInteger(value["createdAtMs"]);
  const number =
    value["number"] === null
      ? null
      : typeof value["number"] === "string" &&
          value["number"].length >= 1 &&
          value["number"].length <= 80 &&
          value["number"].trim() === value["number"]
        ? value["number"]
        : undefined;
  const invoiceRef =
    value["invoiceRef"] === null
      ? ok(null)
      : parseSuiteInvoiceRef(value["invoiceRef"]);
  if (
    amountDueCents === null ||
    amountPaidCents === null ||
    createdAtMs === null ||
    number === undefined ||
    !invoiceRef.ok
  ) {
    return err("invalid-invoice-view");
  }
  return ok({
    amountDueCents,
    amountPaidCents,
    createdAtMs,
    currency: "usd",
    invoiceRef: invoiceRef.value,
    number,
    status: value["status"],
  });
}

function parseFeatures(value: unknown): CurrentSuiteFeatureId[] | null {
  if (!Array.isArray(value) || value.length > 2) return null;
  const parsed: CurrentSuiteFeatureId[] = [];
  for (const entry of value) {
    const feature = parseCurrentSuiteFeatureId(entry);
    if (!feature.ok || parsed.includes(feature.value)) return null;
    parsed.push(feature.value);
  }
  return parsed;
}

export function parseSuiteAccountView(
  value: unknown,
): Result<SuiteAccountView, "invalid-account-view"> {
  if (!isRecord(value)) return err("invalid-account-view");
  const accountId = parseSuiteAccountId(value["accountId"]);
  const email = parseEmail(value["email"]);
  const name = parseOptionalName(value["name"]);
  const username = value["username"] === null || value["username"] === undefined
    ? ok(null)
    : parseSuiteUsername(value["username"]);
  const subscription =
    value["subscription"] === null
      ? ok(null)
      : parseSuiteSubscriptionView(value["subscription"]);
  const plan =
    value["plan"] === null ? ok(null) : parseSuitePlanId(value["plan"]);
  const features = parseFeatures(value["features"]);
  if (
    !accountId.ok ||
    value["catalogRevision"] !== SUITE_CATALOG_REVISION ||
    email === null ||
    name === undefined ||
    !username.ok ||
    !subscription.ok ||
    !plan.ok ||
    features === null ||
    !Array.isArray(value["invoices"]) ||
    value["invoices"].length > 100 ||
    plan.value !== (subscription.value?.plan ?? null)
  ) {
    return err("invalid-account-view");
  }
  const statusCanGrant =
    subscription.value !== null &&
    (subscription.value.status === "active" ||
      subscription.value.status === "trialing");
  const planFeatures =
    subscription.value === null
      ? []
      : featuresForSuitePlan(subscription.value.plan);
  const exactPositiveGrant =
    statusCanGrant &&
    features.length === planFeatures.length &&
    features.every((feature, index) => feature === planFeatures[index]);
  // A backend may remove an otherwise eligible grant at an additional
  // fail-closed boundary such as current-period expiry. Positive grants still
  // have to match the checked catalog exactly; only the empty projection is a
  // valid conservative subset.
  if (features.length > 0 && !exactPositiveGrant) {
    return err("invalid-account-view");
  }
  const invoices: SuiteInvoiceView[] = [];
  for (const entry of value["invoices"]) {
    const invoice = parseSuiteInvoiceView(entry);
    if (!invoice.ok) return err("invalid-account-view");
    invoices.push(invoice.value);
  }
  return ok({
    accountId: accountId.value,
    catalogRevision: SUITE_CATALOG_REVISION,
    email,
    features,
    invoices,
    name,
    plan: plan.value,
    subscription: subscription.value,
    username: username.value,
  });
}
