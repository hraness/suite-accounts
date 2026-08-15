import { describe, expect, test } from "bun:test";

import {
  parseSuiteAccountView,
  type SuiteAccountView,
} from "./views";
import { SUITE_CATALOG_REVISION } from "./catalog";
import {
  parseSuiteAccountId,
  parseSuiteInvoiceRef,
} from "./identifiers";
import { parseSuiteUsername } from "./usernames";

const parsedAccountId = parseSuiteAccountId(
  "acct_018f1f7a7a367ccdbd5d706d4dc5c018",
);
if (!parsedAccountId.ok) throw new Error("The test account ID is invalid.");
const parsedInvoiceRef = parseSuiteInvoiceRef(
  "invref_018f1f7a7a367ccdbd5d706d4dc5c018",
);
if (!parsedInvoiceRef.ok) throw new Error("The test invoice reference is invalid.");
const parsedUsername = parseSuiteUsername("reader");
if (!parsedUsername.ok) throw new Error("The test username is invalid.");

const view: SuiteAccountView = {
  accountId: parsedAccountId.value,
  catalogRevision: SUITE_CATALOG_REVISION,
  email: "reader@example.com",
  features: ["suite.paid"],
  invoices: [
    {
      amountDueCents: 1_000,
      amountPaidCents: 1_000,
      createdAtMs: 1_800_000_000_000,
      currency: "usd",
      invoiceRef: parsedInvoiceRef.value,
      number: "CCLRTE-0001",
      status: "paid",
    },
  ],
  name: null,
  plan: "individual",
  subscription: {
    cancelAtPeriodEnd: false,
    catalogRevision: SUITE_CATALOG_REVISION,
    currentPeriodEndMs: 1_802_678_400_000,
    plan: "individual",
    status: "active",
  },
  username: parsedUsername.value,
};

describe("suite account views", () => {
  test("accepts the bounded browser contract", () => {
    expect(parseSuiteAccountView(view)).toEqual({ ok: true, value: view });
  });

  test("accepts canonical usernames and migration-safe onboarding nulls", () => {
    expect(parseSuiteAccountView({ ...view, username: null }).ok).toBe(true);
    const legacy: Record<string, unknown> = { ...view };
    delete legacy["username"];
    expect(parseSuiteAccountView(legacy)).toEqual({
      ok: true,
      value: { ...view, username: null },
    });
    expect(parseSuiteAccountView({ ...view, username: "admin" }).ok).toBe(true);
    for (const username of ["Reader", "two words"]) {
      expect(parseSuiteAccountView({ ...view, username })).toEqual({
        error: "invalid-account-view",
        ok: false,
      });
    }
  });

  test("fails closed when the catalog revision is missing or unsupported", () => {
    const missingRevision: Record<string, unknown> = { ...view };
    delete missingRevision["catalogRevision"];
    expect(parseSuiteAccountView(missingRevision)).toEqual({
      error: "invalid-account-view",
      ok: false,
    });
    expect(
      parseSuiteAccountView({
        ...view,
        catalogRevision: "cclrte-suite-v4",
      }),
    ).toEqual({ error: "invalid-account-view", ok: false });
  });

  test("retains the exact subscription catalog while projecting current grants", () => {
    const previousSubscription: SuiteAccountView = {
      ...view,
      subscription: {
        ...view.subscription!,
        catalogRevision: "cclrte-suite-v2",
      },
    };
    expect(parseSuiteAccountView(previousSubscription)).toEqual({
      ok: true,
      value: previousSubscription,
    });

    const legacyFan: SuiteAccountView = {
      ...view,
      features: ["suite.paid", "suite.believer"],
      plan: "business",
      subscription: {
        ...view.subscription!,
        catalogRevision: "cclrte-suite-v1",
        plan: "business",
      },
    };
    expect(parseSuiteAccountView(legacyFan)).toEqual({
      ok: true,
      value: legacyFan,
    });
  });

  test("fails closed when subscription catalog provenance is missing or unknown", () => {
    const subscription: Record<string, unknown> = { ...view.subscription! };
    delete subscription["catalogRevision"];
    expect(parseSuiteAccountView({ ...view, subscription })).toEqual({
      error: "invalid-account-view",
      ok: false,
    });
    expect(
      parseSuiteAccountView({
        ...view,
        subscription: {
          ...view.subscription!,
          catalogRevision: "cclrte-suite-v4",
        },
      }),
    ).toEqual({ error: "invalid-account-view", ok: false });
  });

  test("rejects legacy catalog state from the current public view", () => {
    expect(
      parseSuiteAccountView({
        ...view,
        catalogRevision: "cclrte-suite-v1",
        features: ["suite.paid", "suite.business"],
        plan: "business",
        subscription: {
          ...view.subscription!,
          plan: "business",
        },
      }),
    ).toEqual({ error: "invalid-account-view", ok: false });
    expect(
      parseSuiteAccountView({
        ...view,
        features: ["suite.paid", "suite.business"],
      }),
    ).toEqual({ error: "invalid-account-view", ok: false });
    expect(
      parseSuiteAccountView({
        ...view,
        plan: "business",
      }),
    ).toEqual({ error: "invalid-account-view", ok: false });
  });

  test("retains billing history without granting delinquent subscriptions", () => {
    const delinquent: SuiteAccountView = {
      ...view,
      features: [],
      subscription: {
        ...view.subscription!,
        status: "past_due",
      },
    };
    expect(parseSuiteAccountView(delinquent)).toEqual({
      ok: true,
      value: delinquent,
    });
    expect(
      parseSuiteAccountView({
        ...delinquent,
        features: ["suite.paid"],
      }),
    ).toEqual({ error: "invalid-account-view", ok: false });
  });

  test("accepts a fail-closed grant after an active period has elapsed", () => {
    const elapsed: SuiteAccountView = {
      ...view,
      features: [],
      subscription: {
        ...view.subscription!,
        currentPeriodEndMs: 1,
      },
    };
    expect(parseSuiteAccountView(elapsed)).toEqual({
      ok: true,
      value: elapsed,
    });
    expect(
      parseSuiteAccountView({
        ...elapsed,
        features: ["suite.business"],
      }),
    ).toEqual({ error: "invalid-account-view", ok: false });
  });

  test("rejects provider-derived and malformed invoice references", () => {
    expect(
      parseSuiteAccountView({
        ...view,
        invoices: [
          {
            ...view.invoices[0],
            invoiceRef: "in_provider_invoice",
          },
        ],
      }),
    ).toEqual({ error: "invalid-account-view", ok: false });
    expect(
      parseSuiteAccountView({
        ...view,
        invoices: [
          {
            ...view.invoices[0],
            invoiceRef: "https://invoice.stripe.com/i/example",
          },
        ],
      }),
    ).toEqual({ error: "invalid-account-view", ok: false });
  });
});
