import { expect, test } from "bun:test";

import { createSuiteAccountsClientConfiguration } from "./client-configuration";
import { assertProperty, fc } from "./test-support";

const binding = {
  authMode: "oidc-rp",
  callbackUrl: "https://aicharts.io/api/suite-auth/callback",
  clientId: "hraness:aicharts:production:v1",
  consumer: "aicharts",
  environment: "production",
  origin: "https://aicharts.io",
} as const;

test("AI Charts accepts no arbitrary mutation of its five binding coordinates", () => {
  assertProperty(fc.property(
    fc.constantFrom(
      "authMode", "callbackUrl", "clientId", "environment", "origin",
    ),
    fc.anything(),
    (key, value) => {
      const result = createSuiteAccountsClientConfiguration({ ...binding, [key]: value });
      expect(result.ok).toBe(value === binding[key]);
    },
  ));
});

test("AI Charts never accepts additional arbitrary trust configuration", () => {
  assertProperty(fc.property(
    fc.string().filter(key => !Object.hasOwn(binding, key)),
    fc.anything(),
    (key, value) => {
      expect(createSuiteAccountsClientConfiguration({ ...binding, [key]: value }))
        .toEqual({ ok: false, error: "invalid-binding" });
    },
  ));
});
