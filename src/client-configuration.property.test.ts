import { expect, test } from "bun:test";

import { createSuiteAccountsClientConfiguration } from "./client-configuration";
import { assertProperty, fc } from "./test-support";

test("client configuration parsing is total over arbitrary foreign values", () => {
  assertProperty(fc.property(fc.anything(), (value) => {
    expect(() => createSuiteAccountsClientConfiguration(value)).not.toThrow();
  }));
});

test("no arbitrary field can select a trust value", () => {
  assertProperty(fc.property(
    fc.string().filter(key => ![
      "authMode",
      "callbackUrl",
      "clientId",
      "consumer",
      "environment",
      "origin",
    ].includes(key)),
    fc.anything(),
    (key, value) => {
      const result = createSuiteAccountsClientConfiguration({
        authMode: "oidc-rp",
        callbackUrl: "https://oprte.com/api/suite-auth/callback",
        clientId: "hraness:oprte:production:v1",
        consumer: "oprte",
        environment: "production",
        origin: "https://oprte.com",
        [key]: value,
      });
      expect(result).toEqual({ error: "invalid-binding", ok: false });
    },
  ));
});
