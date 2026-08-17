import {
  productLinkProofMessage,
  parseSuiteLinkProduct,
  suiteEntitlementReceiptMessage,
  suiteLinkReceiptMessage,
  validateProductLinkProof,
  validateSuiteEntitlementReceipt,
  validateSuiteLinkReceipt,
  type ProductLinkProof,
  type SignedSuiteLinkProduct,
  type SuiteEntitlementReceipt,
  type SuiteLinkProduct,
  type SuiteLinkReceipt,
} from "./identity/links.js";
import {
  isSuiteIssuableEnvironment,
  parseSuiteEnvironment,
  type SuiteEnvironment,
} from "./identity/principals.js";
import { deepFreeze } from "./immutable.js";

export type SuiteReceiptKey = Readonly<{
  environment: SuiteEnvironment;
  keyVersion: string;
  product: SuiteLinkProduct;
  secret: string;
}>;

export type SuiteReceiptKeyring = Readonly<{
  keys: readonly SuiteReceiptKey[];
  version: 1;
}>;

export type SuiteReceiptConfiguration = Readonly<{
  key: SuiteReceiptKey;
  keyring: SuiteReceiptKeyring;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseSuiteReceiptKeyring(
  value: unknown,
): SuiteReceiptKeyring | null {
  let decoded: unknown = value;
  if (typeof value === "string") {
    if (value.length > 32_768) return null;
    try {
      decoded = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  if (
    !isRecord(decoded)
    || decoded["version"] !== 1
    || !Array.isArray(decoded["keys"])
    || decoded["keys"].length < 1
    || decoded["keys"].length > 20
  ) {
    return null;
  }
  const keys: SuiteReceiptKey[] = [];
  const identities = new Set<string>();
  for (const rawKey of decoded["keys"]) {
    if (!isRecord(rawKey)) return null;
    const { environment, keyVersion, product, secret } = rawKey;
    const parsedEnvironment = parseSuiteEnvironment(environment);
    const parsedProduct = parseSuiteLinkProduct(product);
    if (
      !parsedEnvironment.ok
      || !parsedProduct.ok
      || !/^[a-z0-9][a-z0-9._-]{0,31}$/u.test(String(keyVersion))
      || typeof secret !== "string"
      || new TextEncoder().encode(secret).byteLength < 32
      || secret.length > 1_024
    ) {
      return null;
    }
    const identity = `${parsedProduct.value}:${parsedEnvironment.value}:${String(
      keyVersion,
    )}`;
    if (identities.has(identity)) return null;
    identities.add(identity);
    keys.push({
      environment: parsedEnvironment.value,
      keyVersion: String(keyVersion),
      product: parsedProduct.value,
      secret,
    });
  }
  return deepFreeze({ keys, version: 1 });
}

/**
 * Select the one active issuance key while retaining prior versions for
 * bounded verification during rotation.
 *
 * Staging keys remain parseable only to verify bounded historical evidence.
 * They can never become the active key for new proof or receipt issuance.
 */
export function selectSuiteReceiptConfiguration(
  value: unknown,
  product: SignedSuiteLinkProduct,
  activeKeyVersion: unknown,
): SuiteReceiptConfiguration | null {
  const canonicalProduct = parseSuiteLinkProduct(product);
  if (
    !canonicalProduct.ok
    || typeof activeKeyVersion !== "string"
    || !/^[a-z0-9][a-z0-9._-]{0,31}$/u.test(activeKeyVersion)
  ) {
    return null;
  }
  const keyring = parseSuiteReceiptKeyring(value);
  if (keyring === null) return null;
  const active = keyring.keys.filter(key =>
    key.product === canonicalProduct.value
    && key.keyVersion === activeKeyVersion
    && isSuiteIssuableEnvironment(key.environment)
  );
  if (active.length !== 1) return null;
  const key = active[0]!;
  const verificationKeys = keyring.keys.filter(candidate =>
    candidate.product === canonicalProduct.value
    && candidate.environment === key.environment
  );
  return deepFreeze({
    key,
    keyring: { keys: verificationKeys, version: 1 },
  });
}

function keyFor(
  keyring: SuiteReceiptKeyring,
  product: SignedSuiteLinkProduct,
  environment: SuiteEnvironment,
  keyVersion: string,
): SuiteReceiptKey | null {
  const canonicalProduct = parseSuiteLinkProduct(product);
  if (!canonicalProduct.ok) return null;
  return keyring.keys.find(key =>
    key.product === canonicalProduct.value
    && key.environment === environment
    && key.keyVersion === keyVersion
  ) ?? null;
}

function decodeSignature(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]{43}$/u.test(value)) return null;
  try {
    const binary = atob(
      value.replaceAll("-", "+").replaceAll("_", "/") + "=",
    );
    const result = new Uint8Array(new ArrayBuffer(binary.length));
    for (let index = 0; index < binary.length; index += 1) {
      result[index] = binary.charCodeAt(index);
    }
    return result.byteLength === 32 ? result : null;
  } catch {
    return null;
  }
}

async function hmac(
  secret: string,
  message: string,
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  return await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
}

async function verifySignature(
  secret: string,
  message: string,
  signature: string,
): Promise<boolean> {
  const received = decodeSignature(signature);
  if (received === null) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["verify"],
  );
  return await crypto.subtle.verify(
    "HMAC",
    key,
    received,
    new TextEncoder().encode(message),
  );
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

export async function signSuiteProductLinkProof(
  proof: ProductLinkProof,
  keyring: SuiteReceiptKeyring,
  nowMs: number,
): Promise<string | null> {
  if (
    validateProductLinkProof(proof, nowMs) !== null
    || !isSuiteIssuableEnvironment(proof.environment)
  ) return null;
  const key = keyFor(
    keyring,
    proof.product,
    proof.environment,
    proof.keyVersion,
  );
  return key === null
    ? null
    : encodeBase64Url(
        new Uint8Array(await hmac(key.secret, productLinkProofMessage(proof))),
      );
}

export async function verifySuiteLinkReceiptSignature(
  receipt: SuiteLinkReceipt,
  keyring: SuiteReceiptKeyring,
  nowMs: number,
): Promise<boolean> {
  if (validateSuiteLinkReceipt(receipt, nowMs) !== null) return false;
  const key = keyFor(
    keyring,
    receipt.product,
    receipt.environment,
    receipt.keyVersion,
  );
  return key !== null && await verifySignature(
    key.secret,
    suiteLinkReceiptMessage(receipt),
    receipt.signature,
  );
}

export async function verifySuiteEntitlementReceiptSignature(
  receipt: SuiteEntitlementReceipt,
  keyring: SuiteReceiptKeyring,
  nowMs: number,
): Promise<boolean> {
  if (validateSuiteEntitlementReceipt(receipt, nowMs) !== null) return false;
  const key = keyFor(
    keyring,
    receipt.product,
    receipt.environment,
    receipt.keyVersion,
  );
  return key !== null && await verifySignature(
    key.secret,
    suiteEntitlementReceiptMessage(receipt),
    receipt.signature,
  );
}
