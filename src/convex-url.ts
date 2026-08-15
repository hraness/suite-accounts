export type ConvexDeployment =
  | Readonly<{ kind: "missing" }>
  | Readonly<{
      input: string;
      kind: "invalid";
      message: string;
      reason:
        | "credentials"
        | "insecure-remote"
        | "not-a-url"
        | "not-an-origin";
    }>
  | Readonly<{
      kind: "ready";
      origin: string;
      transport: "cloud" | "local";
      url: string;
    }>;

const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "[::1]", "localhost"]);

function invalid(
  input: string,
  reason: Extract<ConvexDeployment, { kind: "invalid" }>["reason"],
  message: string,
): ConvexDeployment {
  return deepFreeze({ input, kind: "invalid", message, reason });
}

/** Parse untrusted public configuration into one safe Convex origin. */
export function parseConvexDeployment(value: unknown): ConvexDeployment {
  if (typeof value !== "string" || value.trim() === "") {
    return deepFreeze({ kind: "missing" });
  }

  const input = value.trim();
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return invalid(input, "not-a-url", "Use a complete Convex deployment URL.");
  }

  if (parsed.username !== "" || parsed.password !== "") {
    return invalid(
      input,
      "credentials",
      "Deployment URLs cannot contain credentials.",
    );
  }
  if (parsed.pathname !== "/" || parsed.search !== "" || parsed.hash !== "") {
    return invalid(
      input,
      "not-an-origin",
      "Use the deployment origin without a path or query.",
    );
  }

  const local = LOCAL_HOSTNAMES.has(parsed.hostname);
  if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) {
    return invalid(
      input,
      "insecure-remote",
      "Remote Convex deployments must use HTTPS.",
    );
  }
  return deepFreeze({
    kind: "ready",
    origin: parsed.origin,
    transport: local ? "local" : "cloud",
    url: parsed.origin,
  });
}
import { deepFreeze } from "./immutable.js";
