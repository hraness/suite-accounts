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
        callbackUrl: "https://oompa.app/api/suite-auth/callback",
        clientId: "hraness:hra:production:v1",
        consumer: "hra",
        environment: "production",
        origin: "https://oompa.app",
        [key]: value,
      });
      expect(result).toEqual({ error: "invalid-binding", ok: false });
    },
  ));
});
