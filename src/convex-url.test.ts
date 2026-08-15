import { describe, expect, test } from "bun:test";

import { parseConvexDeployment } from "./convex-url";

describe("parseConvexDeployment", () => {
  test("keeps missing configuration explicit", () => {
    expect(parseConvexDeployment(undefined)).toEqual({ kind: "missing" });
    expect(parseConvexDeployment(" \n ")).toEqual({ kind: "missing" });
  });

  test("canonicalizes hosted and loopback origins", () => {
    expect(parseConvexDeployment(" https://calm-otter.convex.cloud/ "))
      .toEqual({
        kind: "ready",
        origin: "https://calm-otter.convex.cloud",
        transport: "cloud",
        url: "https://calm-otter.convex.cloud",
      });
    expect(parseConvexDeployment("HTTP://LOCALHOST:3210/")).toEqual({
      kind: "ready",
      origin: "http://localhost:3210",
      transport: "local",
      url: "http://localhost:3210",
    });
  });

  test("rejects credentials, paths, and insecure remote origins", () => {
    expect(parseConvexDeployment("https://user:pass@example.com"))
      .toMatchObject({ kind: "invalid", reason: "credentials" });
    expect(parseConvexDeployment("https://example.com/functions"))
      .toMatchObject({ kind: "invalid", reason: "not-an-origin" });
    expect(parseConvexDeployment("http://example.com"))
      .toMatchObject({ kind: "invalid", reason: "insecure-remote" });
  });
});
