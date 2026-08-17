import { expect, test } from "bun:test";
import { assertProperty, fc } from "../test-support";

import {
  parseSuiteCatalogRevision,
  parseCurrentSuiteFeatureId,
  parseSuiteFeatureId,
  parseSuitePlanId,
} from "./catalog";
import { parseSuiteConsumerId } from "./consumers";
import {
  parseSuiteAccountId,
  parseSuiteInvoiceRef,
} from "./identifiers";
import {
  normalizeSuiteUsername,
  parseSuiteUsername,
} from "./usernames";
import {
  parseIssuerSubject,
  parseLegacyPrincipalLink,
  parseSuiteProduct,
  parseSuiteJwtClaims,
} from "./principals";
import {
  parseSuiteCommunityProfileView,
  parseSuiteProfileUpdateRequest,
  parseSuiteProfileView,
} from "./profiles";
import { parseSuiteReturnTarget } from "./return-targets";
import {
  parseSuiteAccountView,
  parseSuiteInvoiceView,
  parseSuiteSubscriptionView,
} from "./views";

test("all identity parsers are total over arbitrary foreign values", () => {
  const parsers = [
    parseSuiteCatalogRevision,
    parseCurrentSuiteFeatureId,
    parseSuiteFeatureId,
    parseSuitePlanId,
    parseSuiteConsumerId,
    parseSuiteReturnTarget,
    parseSuiteAccountId,
    parseSuiteInvoiceRef,
    normalizeSuiteUsername,
    parseSuiteUsername,
    parseIssuerSubject,
    parseLegacyPrincipalLink,
    parseSuiteProduct,
    parseSuiteJwtClaims,
    parseSuiteProfileUpdateRequest,
    parseSuiteProfileView,
    parseSuiteCommunityProfileView,
    parseSuiteAccountView,
    parseSuiteInvoiceView,
    parseSuiteSubscriptionView,
  ] as const;
  assertProperty(
    fc.property(fc.anything(), (value) => {
      for (const parser of parsers) {
        expect(() => parser(value)).not.toThrow();
      }
    }),
  );
});

test("predecessor product aliases canonicalize without changing frozen clients", () => {
  assertProperty(fc.property(
    fc.constantFrom("oprte", "kitchen"),
    (product) => {
      expect(parseSuiteProduct(product)).toEqual({
        ok: true,
        value: "hra",
      });
      expect(parseSuiteConsumerId(product)).toEqual({
        ok: true,
        value: "oprte",
      });
    },
  ));
});

test("the retired Loops identity never parses as Soundfish", () => {
  assertProperty(fc.property(
    fc.constant("loops"),
    (product) => {
      expect(parseSuiteProduct(product)).toEqual({
        error: "invalid-product",
        ok: false,
      });
      expect(parseSuiteConsumerId(product)).toEqual({
        error: "invalid-consumer",
        ok: false,
      });
    },
  ));
});

test("reserved route and owner handles stay reserved across ASCII case and trim variants", () => {
  assertProperty(fc.property(
    fc.constantFrom(
      "account",
      "api",
      "design",
      "docs",
      "hraness",
      "new",
      "party",
      "place",
      "pub",
      "social-image",
      "source",
      "sources",
    ),
    fc.array(fc.boolean(), { maxLength: 24, minLength: 24 }),
    fc.constantFrom("", " ", "  "),
    (reserved, uppercase, padding) => {
      const variant = [...reserved]
        .map((character, index) =>
          uppercase[index] ? character.toUpperCase() : character
        )
        .join("");
      expect(normalizeSuiteUsername(`${padding}${variant}${padding}`))
        .toEqual({ error: "suite-username-reserved", ok: false });
    },
  ));
});
