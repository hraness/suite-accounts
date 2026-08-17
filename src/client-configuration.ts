import { err, isRecord, ok, type Result } from "@hraness/result";

import { deepFreeze } from "./immutable.js";
import {
  getSuiteAccountsCurrentConsumerEnvironment,
  getSuiteAccountsConsumer,
  isSuiteAccountsActiveConsumerId,
  isSuiteAccountsConsumerId,
  type SuiteAccountsAuthConfiguration,
  type SuiteAccountsConsumerId,
  type SuiteAccountsRemoteEnvironment,
} from "./registry.js";
import {
  suiteAccountsCurrentOidcClientRegistration,
  suiteAccountsOidcProviderConfiguration,
  type SuiteAccountsOidcProviderConfiguration,
} from "./urls.js";

export const SUITE_ACCOUNTS_CLIENT_CONFIGURATION_VERSION =
  "suite-accounts-client-configuration-v1" as const;
export const SUITE_ACCOUNTS_WIRE_VERSION = "v1" as const;

export type SuiteAccountsClientBinding = Readonly<{
  authMode: SuiteAccountsAuthConfiguration["kind"];
  callbackUrl: string | null;
  clientId: string | null;
  consumer: SuiteAccountsConsumerId;
  environment: SuiteAccountsRemoteEnvironment;
  origin: string;
}>;

export type SuiteAccountsClientConfiguration = Readonly<{
  authBasePath: SuiteAccountsAuthConfiguration["basePath"];
  binding: SuiteAccountsClientBinding;
  configurationVersion: typeof SUITE_ACCOUNTS_CLIENT_CONFIGURATION_VERSION;
  provider: SuiteAccountsOidcProviderConfiguration;
  wireVersion: typeof SUITE_ACCOUNTS_WIRE_VERSION;
}>;

export type SuiteAccountsClientConfigurationIssue =
  | "invalid-auth-mode"
  | "invalid-binding"
  | "invalid-callback-url"
  | "invalid-client-id"
  | "invalid-consumer"
  | "invalid-environment"
  | "invalid-origin";

const BINDING_KEYS = [
  "authMode",
  "callbackUrl",
  "clientId",
  "consumer",
  "environment",
  "origin",
] as const satisfies readonly (keyof SuiteAccountsClientBinding)[];

type SuiteAccountsClientBindingInput = Readonly<{
  [Key in (typeof BINDING_KEYS)[number]]: unknown;
}>;

function snapshotBinding(
  input: unknown,
): SuiteAccountsClientBindingInput | null {
  if (!isRecord(input)) return null;

  try {
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const keys = Reflect.ownKeys(descriptors);
    if (
      keys.length !== BINDING_KEYS.length
      || keys.some(key =>
        typeof key !== "string"
        || !(BINDING_KEYS as readonly string[]).includes(key)
      )
    ) {
      return null;
    }

    for (const key of BINDING_KEYS) {
      const descriptor = descriptors[key];
      if (descriptor === undefined || !("value" in descriptor)) return null;
    }

    return {
      authMode: descriptors.authMode!.value,
      callbackUrl: descriptors.callbackUrl!.value,
      clientId: descriptors.clientId!.value,
      consumer: descriptors.consumer!.value,
      environment: descriptors.environment!.value,
      origin: descriptors.origin!.value,
    };
  } catch {
    return null;
  }
}

function freezeConfiguration(
  binding: SuiteAccountsClientBinding,
  authBasePath: SuiteAccountsAuthConfiguration["basePath"],
  provider: SuiteAccountsOidcProviderConfiguration,
): SuiteAccountsClientConfiguration {
  return deepFreeze({
    authBasePath,
    binding,
    configurationVersion: SUITE_ACCOUNTS_CLIENT_CONFIGURATION_VERSION,
    provider,
    wireVersion: SUITE_ACCOUNTS_WIRE_VERSION,
  });
}

/**
 * Bind one client to an exact Accounts registration.
 *
 * The caller can state only its public binding. Issuer, JWKS, resource,
 * endpoints, protocol version, and client-ID format come from the frozen
 * Accounts registry and cannot be supplied or overridden.
 */
export function createSuiteAccountsClientConfiguration(
  input: unknown,
): Result<
  SuiteAccountsClientConfiguration,
  SuiteAccountsClientConfigurationIssue
> {
  const binding = snapshotBinding(input);
  if (binding === null) return err("invalid-binding");
  if (!isSuiteAccountsConsumerId(binding.consumer)) {
    return err("invalid-consumer");
  }
  if (!isSuiteAccountsActiveConsumerId(binding.consumer)) {
    return err("invalid-consumer");
  }
  if (binding.environment !== "production") {
    return err("invalid-environment");
  }

  const consumer = binding.consumer;
  const environment = binding.environment;
  const registration = getSuiteAccountsConsumer(consumer);
  const deployed = getSuiteAccountsCurrentConsumerEnvironment(
    consumer,
    environment,
  );
  if (deployed === null || binding.origin !== deployed.siteUrl) {
    return err("invalid-origin");
  }
  if (binding.authMode !== registration.auth.kind) {
    return err("invalid-auth-mode");
  }

  const oauth = suiteAccountsCurrentOidcClientRegistration(
    consumer,
    environment,
  );
  const expectedClientId = oauth?.clientId ?? null;
  const expectedCallbackUrl = oauth?.callbackUrl ?? null;
  if (binding.clientId !== expectedClientId) {
    return err("invalid-client-id");
  }
  if (binding.callbackUrl !== expectedCallbackUrl) {
    return err("invalid-callback-url");
  }

  return ok(freezeConfiguration(
    {
      authMode: registration.auth.kind,
      callbackUrl: expectedCallbackUrl,
      clientId: expectedClientId,
      consumer,
      environment,
      origin: deployed.siteUrl,
    },
    registration.auth.basePath,
    suiteAccountsOidcProviderConfiguration(environment),
  ));
}
