import { describe, expect, expectTypeOf, test } from "bun:test";

import {
  parseSuiteConsumerId,
  SUITE_CONSUMER_IDS,
  type LegacySuiteConsumerId,
} from "./consumers";
import { SUITE_PRODUCTS } from "./principals";

describe("suite consumers", () => {
  test("owns the exact Accounts authority consumers", () => {
    expect(SUITE_CONSUMER_IDS).toEqual([
      "accounts",
      "act60",
      "elders",
      "soundfish",
      "oh-computer",
      "draw-money",
      "oprte",
      "sponge",
    ]);
    for (const consumer of SUITE_CONSUMER_IDS) {
      expect(parseSuiteConsumerId(consumer)).toEqual({
        ok: true,
        value: consumer,
      });
    }
    for (const retired of [
      "actvte",
      "cclrte",
      "codingchart",
      "cncntrte",
      "cptvte",
      "dgnrte",
      "fbrcte",
      "hrnss",
      "intmte",
      "invstgte",
      "llstrte",
      "mbira",
      "obfscte",
      "rgnrte",
      "rnvte",
    ]) {
      expect(parseSuiteConsumerId(retired)).toEqual({
        error: "invalid-consumer",
        ok: false,
      });
    }
  });

  test("does not conflate auth consumers with product principals", () => {
    expectTypeOf<LegacySuiteConsumerId>().toEqualTypeOf<
      "kitchen"
    >();
    expect(SUITE_PRODUCTS).not.toContain("accounts");
    expect(SUITE_PRODUCTS).not.toContain("graphics");
    expect(SUITE_CONSUMER_IDS).not.toContain("itrte");
    expect(SUITE_CONSUMER_IDS).not.toContain("mgrte");
    expect(SUITE_CONSUMER_IDS).not.toContain("pub");
    expect(SUITE_CONSUMER_IDS).not.toContain("crclte");
    expect(parseSuiteConsumerId("crclte")).toEqual({
      error: "invalid-consumer",
      ok: false,
    });
    expect(parseSuiteConsumerId("codingchart")).toEqual({
      error: "invalid-consumer",
      ok: false,
    });
    expect(parseSuiteConsumerId("accounts")).toEqual({
      ok: true,
      value: "accounts",
    });
    expect(parseSuiteConsumerId("kitchen")).toEqual({
      ok: true,
      value: "oprte",
    });
    expect(parseSuiteConsumerId("loops")).toEqual({
      error: "invalid-consumer",
      ok: false,
    });
    expect(parseSuiteConsumerId("mbira")).toEqual({
      error: "invalid-consumer",
      ok: false,
    });
    for (const retired of ["transmute", "transmute-cli", "studio", "graphics"]) {
      expect(parseSuiteConsumerId(retired)).toEqual({
        error: "invalid-consumer",
        ok: false,
      });
    }
    expect(parseSuiteConsumerId("itrte")).toEqual({
      error: "invalid-consumer",
      ok: false,
    });
  });
});
