import { expect, test } from "bun:test";
import { assertProperty, fc } from "./test-support";

import { parseSuiteBearerAuthorization } from "./bearer-verifier";

test("suite bearer authorization parsing is total over foreign values", () => {
  assertProperty(fc.property(fc.anything(), (value) => {
    expect(() => parseSuiteBearerAuthorization(value)).not.toThrow();
    const result = parseSuiteBearerAuthorization(value);
    if (result.ok) {
      expect(result.value).toMatch(
        /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u,
      );
      expect(result.value.length).toBeGreaterThanOrEqual(32);
      expect(result.value.length).toBeLessThanOrEqual(16_384);
    }
  }));
});

test("only the exact case-sensitive Bearer scheme accepts compact tokens", () => {
  assertProperty(fc.property(
    fc.array(
      fc.constantFrom(
        ..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
      ),
      { maxLength: 256, minLength: 32 },
    ).map(characters => characters.join("")),
    fc.constantFrom("bearer", "BEARER", "Basic", "Token", " Bearer"),
    (candidate, scheme) => {
      const compact = `${candidate}.payload.signature`;
      expect(parseSuiteBearerAuthorization(`${scheme} ${compact}`)).toEqual({
        error: "invalid-authorization",
        ok: false,
      });
    },
  ));
});
