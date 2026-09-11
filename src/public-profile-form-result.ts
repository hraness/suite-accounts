import {
  parseSuiteProfileEditorV2,
  parseSuiteProfileUpdateV2,
  type SuiteProfileEditorV2,
  type SuiteProfileUpdateV2,
} from "./identity/profiles-v2.js";

export type PublicProfileFormResult =
  | Readonly<{ status: "saved"; profile: SuiteProfileEditorV2 }>
  | Readonly<{ status: "conflict"; profile: SuiteProfileEditorV2 }>
  | Readonly<{ status: "unauthorized" }>
  | Readonly<{ status: "username_required" }>
  | Readonly<{ status: "invalid_avatar" }>;

const LINK_KEYS = [
  "bluesky", "github", "instagram", "linkedin", "telegram", "website", "x",
] as const;

function matchesRequest(profile: SuiteProfileEditorV2, request: SuiteProfileUpdateV2): boolean {
  return profile.name === request.name && profile.bio === request.bio
    && profile.avatarRef === request.avatarRef
    && profile.publication === (request.publication === "publish" ? "published" : "private")
    && LINK_KEYS.every((key) => profile.links[key] === request.links[key]);
}

/** Own the small envelope without invoking property accessors. */
function snapshot(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype) return null;
  const keys = Reflect.ownKeys(value);
  if (keys.length < 1 || keys.length > 2 || !keys.includes("status")) return null;
  const owned = Object.create(null) as Record<string, unknown>;
  for (const key of keys) {
    if (key !== "status" && key !== "profile") return null;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable
      || !Object.hasOwn(descriptor, "value")) return null;
    const field: unknown = descriptor.value;
    owned[key] = field;
  }
  return owned;
}

/** Validate a save response against its request; this does not authenticate it. */
export function parsePublicProfileFormResult(
  value: unknown,
  currentProfile: SuiteProfileEditorV2,
  request: SuiteProfileUpdateV2,
): PublicProfileFormResult | null {
  try {
    // Snapshot both expectations before reflecting over a foreign response.
    const current = parseSuiteProfileEditorV2(currentProfile);
    const update = parseSuiteProfileUpdateV2(request);
    if (!current.ok || !update.ok || update.value.expectedRevision !== current.value.revision) return null;
    const envelope = snapshot(value);
    if (envelope === null) return null;
    const status = envelope["status"];
    if (status === "unauthorized" || status === "username_required" || status === "invalid_avatar") {
      return Object.hasOwn(envelope, "profile") ? null : Object.freeze({ status });
    }
    if (status !== "saved" && status !== "conflict") return null;
    if (!Object.hasOwn(envelope, "profile")) return null;
    const parsed = parseSuiteProfileEditorV2(envelope["profile"]);
    if (!parsed.ok || parsed.value.accountId !== current.value.accountId) return null;
    const profile = parsed.value;
    const expected = update.value;
    if (status === "conflict") {
      return profile.revision > expected.expectedRevision
        ? Object.freeze({ status, profile })
        : null;
    }
    const sameRevision = profile.revision === expected.expectedRevision
      && matchesRequest(current.value, expected);
    const nextRevision = expected.expectedRevision < Number.MAX_SAFE_INTEGER
      && profile.revision === expected.expectedRevision + 1;
    if ((!sameRevision && !nextRevision) || !matchesRequest(profile, expected)) return null;
    return Object.freeze({ status, profile });
  } catch {
    return null;
  }
}
