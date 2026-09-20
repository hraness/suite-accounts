import { describe, expect, test } from "bun:test";

import {
  SUITE_MEMBERSHIP_PRODUCTS,
  type SuiteMembershipProduct,
} from "./membership";

const product: SuiteMembershipProduct | undefined =
  SUITE_MEMBERSHIP_PRODUCTS[0];

describe("suite membership product list", () => {
  test("lists each included product once with public display metadata", () => {
    expect(SUITE_MEMBERSHIP_PRODUCTS.length).toBeGreaterThan(0);
    const ids = new Set<string>();
    const hrefs = new Set<string>();
    for (const entry of SUITE_MEMBERSHIP_PRODUCTS) {
      expect(entry.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
      expect(entry.emoji.length).toBeGreaterThan(0);
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.href).toMatch(/^https:\/\/[^\s]+$/u);
      expect(ids.has(entry.id)).toBe(false);
      expect(hrefs.has(entry.href)).toBe(false);
      ids.add(entry.id);
      hrefs.add(entry.href);
    }
    expect(product).toBeDefined();
  });

  test("excludes retired Oompa from current membership marketing", () => {
    expect(SUITE_MEMBERSHIP_PRODUCTS.some(entry => String(entry.id) === "hra"))
      .toBe(false);
    expect(SUITE_MEMBERSHIP_PRODUCTS.some(entry => entry.id === "peopleblade"))
      .toBe(true);
  });

  test("keeps only the admitted membership IDs in portfolio priority order", () => {
    expect(SUITE_MEMBERSHIP_PRODUCTS.map(entry => entry.id)).toEqual(["aicharts", "kb", "oh-computer", "sponge", "peopleblade", "ghostget", "soulscrape", "slopcamera", "sloptrade", "hraness", "sleepyland", "stripe-history", "eds-research", "act60", "platonik", "direct", "clankdar", "lifedaysleft", "swft"]);
    for (const entry of SUITE_MEMBERSHIP_PRODUCTS) {
      expect(String(entry.name)).toBe(entry.name.toUpperCase());
    }
  });

  test("keeps the list deeply frozen", () => {
    expect(Object.isFrozen(SUITE_MEMBERSHIP_PRODUCTS)).toBe(true);
    for (const entry of SUITE_MEMBERSHIP_PRODUCTS) {
      expect(Object.isFrozen(entry)).toBe(true);
    }
  });
});
