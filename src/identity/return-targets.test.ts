import { describe, expect, test } from "bun:test";

import {
  parseSuiteReturnTarget,
  SUITE_RETURN_TARGETS,
} from "./return-targets";
import { SUITE_CONSUMER_IDS } from "./consumers";

describe("suite billing return targets", () => {
  test("owns only exact server-reviewed billing destinations", () => {
    expect(SUITE_RETURN_TARGETS).toEqual(["accounts"]);
    expect(parseSuiteReturnTarget("accounts")).toEqual({
      ok: true,
      value: "accounts",
    });
    expect(parseSuiteReturnTarget("crclte")).toEqual({
      error: "invalid-return-target",
      ok: false,
    });
    expect(parseSuiteReturnTarget("pub")).toEqual({
      error: "invalid-return-target",
      ok: false,
    });
  });

  test("does not authorize every auth consumer as a billing redirect", () => {
    expect(SUITE_CONSUMER_IDS).toContain("sup");
    for (const retired of ["transmute", "transmute-cli", "studio", "graphics"]) {
      expect(SUITE_CONSUMER_IDS).not.toContain(retired);
      expect(parseSuiteReturnTarget(retired)).toEqual({
        error: "invalid-return-target",
        ok: false,
      });
    }
    expect(parseSuiteReturnTarget("https://example.com")).toEqual({
      error: "invalid-return-target",
      ok: false,
    });
  });
});
