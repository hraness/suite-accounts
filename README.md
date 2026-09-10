# hraness/suite-accounts

Give a Hraness product one registered sign-in and authorization boundary without
letting application code choose what to trust. `@hraness/suite-accounts`
accepts an exact product binding, returns closed OAuth and OIDC configuration,
keeps browser bearer custody on the server, and parses identity and entitlement
evidence from `unknown`.

The first useful result is a frozen configuration tied to one known origin,
callback, client ID, and authentication mode. A misspelled field, retired
client, unregistered origin, or caller-supplied trust value fails before the
product starts an Accounts flow.

Accounts remains the sole authority for account records, OAuth client
registration, identity links, and entitlements. Installing this package does
not let a product register itself or choose an issuer, JWKS endpoint, resource,
callback, client ID, wire version, or trust algorithm.

## Install

Pin the immutable release:

```json
{
  "dependencies": {
    "@hraness/suite-accounts": "github:hraness/suite-accounts#v0.5.3"
  }
}
```

Then install with Bun 1.3.14:

```sh
bun install
```

React and React DOM 18.3.1 through 19.x are optional peers. Install them only
when using `@hraness/suite-accounts/react` or
`@hraness/suite-accounts/profile-form`.

Import `@hraness/suite-accounts/profile-form.css` once when rendering the profile
form. It loads the precompiled StyleX stylesheet; consumers do not need a Babel
plugin or a StyleX runtime compiler. The semantic `suite-profile-*` classes stay
available for inspection, and caller classes remain on the form.

The seven public variables are `--suite-profile-input-background`,
`--suite-profile-line`, `--suite-profile-focus`, `--suite-profile-muted`,
`--suite-profile-button-background`, `--suite-profile-button-foreground`, and
`--suite-profile-error`. Native readonly, disabled, and focus-visible behavior
is preserved. Width and padding retain the existing physical-axis contract in
vertical writing modes.

Applications that already join StyleX package rules can consume
`@hraness/suite-accounts/stylex-manifest.json` and
`@hraness/suite-accounts/compiler-foundation.css` with the public
`@hraness/ui/stylex-build` compiler. In that mode, include the generated rule
union instead of the standalone `profile-form.css` or `stylex.css` export.
The profile form is the only styled runtime entry. Root authentication and
protocol imports do not import React or StyleX presentation.

Version 0.5.3 renames the current `hra` registration to Oompa and moves its
production surface to `https://oompa.dev`. The stable `hra` consumer ID and
`hraness:hra:production:v1` client ID remain unchanged, so existing identity
links, receipts, and stored evidence stay compatible. A product binding must
now supply the `https://oompa.dev` origin and callback; `https://hra.sh`
gains no current Accounts authority.

Version 0.5.2 builds the profile manifest with UI v0.5.12 and its fail-fast
property-validation contract. Compiler adopters must use compatible manifests
for every registered package and start a fresh generation after upgrading.
The prior rollback pair is Suite Accounts v0.5.1 with UI v0.5.3. This compiler
change adds no runtime or peer dependency and does not change authentication,
profile behavior, or the existing presentation recipes.

## First proof: bind one registered client

Pass the exact public fields assigned to the product. The factory rejects
unknown fields, including attempts to supply authority-controlled trust data.

```ts
import { createSuiteAccountsClientConfiguration } from
  "@hraness/suite-accounts/client-configuration";

const configuration = createSuiteAccountsClientConfiguration({
  authMode: "oidc-rp",
  callbackUrl: "https://oompa.dev/api/suite-auth/callback",
  clientId: "hraness:hra:production:v1",
  consumer: "hra",
  environment: "production",
  origin: "https://oompa.dev",
});

if (!configuration.ok) {
  throw new Error(`Invalid Accounts binding: ${configuration.error}`);
}

configuration.value.provider.issuer;
// "https://account.hraness.com"
```

For the registered Oompa production client, the checked result begins with:

```json
{
  "authBasePath": "/api/suite-auth",
  "configurationVersion": "suite-accounts-client-configuration-v1",
  "provider": {
    "issuer": "https://account.hraness.com",
    "resource": "https://hraness.com/suite"
  },
  "wireVersion": "v1"
}
```

The example shows selected fields from the returned configuration. The package
also supplies the authorization, token, revocation, userinfo, JWKS, identity
link, and entitlement receipt endpoints from closed current-authority data.

The returned configuration is frozen. Its provider endpoints, resource,
configuration version, and wire version are derived from the package's checked
current authority data. The Accounts service independently enforces the same
registration, so this client-side check never creates authority.

Local development still uses `parseSuiteAccountsPublicConfig`. The consumer
origin and both Accounts Convex origins must use one exact loopback hostname.
Remote configuration accepts only the checked production deployment.
Generated Vercel Preview surfaces can report their surface origin through
`NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN`, but suite authentication remains
unavailable there.

## Follow the trust path

```text
browser
  -> product-owned /api/suite-auth route and encrypted HttpOnly session
  -> registered Accounts authorization, token, userinfo, and JWKS endpoints
  -> product server verifies audience, client binding, receipt, and entitlement
  -> browser receives bounded session JSON, never an OAuth bearer
```

The package participates at each protocol boundary, but it does not become the
Accounts service or the product backend:

| Authority | Owns |
| --- | --- |
| Accounts service | Account records, client registration, identity links, entitlements, and authoritative provider operations |
| `@hraness/suite-accounts` | Closed registrations, trust configuration, protocol parsers, server transports, receipt verification, and optional React adapters |
| Product | Its registered origin and callback, cookie encryption keys, local subject, authorization decision, interface copy, and provider deployment |

## Use the identity protocol

Import provider-neutral identity parsers and signed-message builders from the
`identity` subpath:

```ts
import {
  parseSuiteAccountId,
  parseSuiteJwtClaims,
  parseSuiteUsername,
  suiteEntitlementReceiptMessage,
} from "@hraness/suite-accounts/identity";
```

The identity catalog contains only the finite revisions, plan IDs, feature IDs,
and plan-to-feature relationship required to verify signed evidence. Prices,
provider lookup keys, product copy, and provider event replay policy are not
part of this package.

`parseSuiteJwtClaims` performs structural parsing. It does not establish
signature, issuer, audience, or time trust. Use the registry-pinned verifier
for authorization.

## Interface map

| Subpath | Intended runtime |
| --- | --- |
| `.` | Dependency-light configuration, registry, URL, and Convex browser-token contracts |
| `./auth-client` | Legacy product-neutral browser auth adapter |
| `./identity` | Provider-neutral identity types, parsers, views, and signed messages |
| `./identity/functions` | Opt-in Convex function references and billing transport types |
| `./identity/return-targets` | Opt-in Accounts-owned billing return-target identifiers |
| `./client-configuration` | Additive validated product-binding factory |
| `./browser-session` | Same-origin browser session reads and serialized refresh |
| `./oidc-rp` | Server-only OAuth 2.1 relying-party implementation |
| `./oidc-session-policy` | Shared encrypted-cookie and session-lifetime policy |
| `./oidc-surface-server` | Registered browser-RP server handlers |
| `./bearer-verifier` | Server-only registry-pinned ES256 bearer verification |
| `./receipt-verifier` | Server-only HMAC receipt and product-keyring verification |
| `./convex-browser-auth` | Product Convex token configuration and identity parsing |
| `./convex-browser-auth-browser` | Memory-only browser bearer loader |
| `./convex-browser-auth-server` | Server-only short-token signing and JWKS handlers |
| `./auth-proxy` | Same-origin compatibility proxy with fixed headers and cookies |
| `./entitlements` | Post-signature entitlement checks and receipt ordering |
| `./profile` | Provider-neutral profile contracts |
| `./profile-form` | Optional controlled React profile editor |
| `./profile-form.css` | Product-neutral profile-form styles |
| `./stylex.css` | Precompiled standalone profile rules |
| `./stylex-manifest.json` | Canonical rule manifest for an application-wide compiler join |
| `./compiler-foundation.css` | Empty structural foundation for compiler adopters |
| `./public-config` | Validated public development and production configuration |
| `./react` | Optional route-local Accounts Convex context |
| `./registry` | Deprecated v1 compatibility registry and distinct current authority |
| `./urls` | Closed Accounts and product URL helpers |

Import server-only modules only from server code.

## Trust boundary

The package preserves these checks across the public surface:

- OAuth authorization code uses S256 PKCE plus exact state and nonce checks.
- Issuer, audience, origin, callback, client ID, resource, and endpoints must
  match the registered values.
- OAuth access and refresh tokens remain in encrypted HttpOnly cookies or
  server-to-server requests. Browser session JSON never exposes bearer tokens.
- A verified callback ends the cross-site redirect chain before a nonce-locked
  continuation starts the product navigation from its registered origin.
- Refresh-token rotation uses an origin-scoped exclusive lock and re-reads the
  session after acquiring it.
- Bearer verification accepts only bounded public P-256 ES256 keys from the
  pinned JWKS endpoint and enforces both client-binding claims.
- Product backends grant access only after receipt, replay, freshness,
  entitlement, and exact feature checks succeed.
- Missing legacy entitlement claims grant no suite features. Malformed claims
  invalidate the token.

Do not authorize from browser profile JSON, decoded JWT data, discovery
destinations, billing plan membership, or an unverified receipt.

## Frozen v1 protocol compatibility

`SUITE_CONSUMER_IDS` preserves released identity values for historical parsing.
`SUITE_ACCOUNTS_CONSUMERS`, `SUITE_ACCOUNTS_DEPLOYMENTS`, their policy arrays,
and their lookup helpers are deeply runtime-frozen and deprecated for new
consumers. Retired identities are absent from those registration and trust
surfaces even when a parser still accepts them at a bounded historical
boundary.

Current authority lives under the distinct
`SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS` and
`SUITE_ACCOUNTS_CURRENT_CONSUMERS` exports and their current lookup helpers.
New registration remains an Accounts service change followed by a package
release and an exact factory binding. Retired client identifiers and routes are
rejected by current APIs.

The published v1 browser refresh-lock and session-notification channel strings
also remain unchanged in version 0.1. Existing tabs therefore coordinate
across a rolling package migration without a browser namespace cutover.

The compatibility registry is intentionally closed. It must not gain runtime
mutation, remote discovery, environment overrides, or caller-supplied trust
values.

## Current compatibility evidence

The immutable `v0.5.3` release matches the install example and package
manifest. Its current changes remain bounded:

| Release | Checked change |
| --- | --- |
| `v0.5.3` | Renames the current `hra` registration to Oompa and moves its production origin to `https://oompa.dev` without changing its client ID. `https://hra.sh` gains no current Accounts authority. |
| `v0.5.2` | Rebuilds the unchanged profile recipes and manifest against UI v0.5.12, binding fail-fast property validation while preserving presentation-free authentication entries and optional React peers. |
| `v0.5.1` | Ends the verified OAuth callback with a nonce-locked same-origin continuation document, so the return page resolves its session without admitting a cross-site request. |
| `v0.5.0` | Compiles the optional native profile form with StyleX, preserving public variables, semantic hooks, save behavior, and non-React authentication boundaries. Publishes a canonical compiler manifest and verifies standalone styles in a real browser. |
| `v0.4.2` | Adds verified-account-email accessors for provisioning before optional username onboarding. Live userinfo must match subject, client, Suite account, and profile state; the accessor returns only an `email_verified` address. |
| `v0.4.1` | Registers PeopleBlade at `https://peopleblade.com` for email-OTP OIDC. Its signed product-link receipt binds local and Suite subjects; email equality never creates or merges a link. |
| `v0.4.0` | Removes the retired OPRTE browser client from current and deprecated registration helpers while preserving bounded historical product-ID parsing. |
| `v0.3.7` | Moves the stable `slackorgs` consumer registration to BigDataDepot at `https://bigdatadepot.com` without changing its client ID. Predecessor origins gain no Accounts authority. |
| `v0.3.6` | Moves the current Sponge origin to `https://sponge.computer` without changing its client ID. |

Deterministic tests exercise valid registrations and readable failures.
Property tests cover foreign-value parsers, ordering, and round trips. The
package smoke installs built entries into clean Bundler and NodeNext consumers
with React 18.3.1 and 19.2.3, then builds the client entries in a clean Next.js
16.2 webpack consumer.

## Service boundary

This repository does not contain billing prices or provider lookup keys,
authoritative registry writes, reconciliation jobs, email delivery, provider
credentials, webhook payloads, provider project identifiers, or product-owned
service policy. Those concerns belong to the Accounts service. The Convex
function references and billing transport types required by existing clients
are isolated behind explicit opt-in identity subpaths; the root and client
configuration entries do not load them.

## Questions before integration

### Can a product register itself with this package?

No. The product must already exist in current Accounts authority. The validated
factory can confirm that binding, but it cannot create or widen it.

### Can browser code authorize from session JSON or a decoded JWT?

No. Browser JSON is a display and session-state surface. A product server must
verify signature, issuer, audience, client binding, time, receipt ordering, and
the exact required entitlement before it grants access.

### Does this package own prices, billing, or provider reconciliation?

No. It contains finite identity and entitlement protocol values plus opt-in
transport types. Prices, provider keys, events, credentials, and product policy
stay with their authoritative services.

### Where should a new integration start?

Start with `./client-configuration` and commit the exact assigned binding. Add
`./oidc-surface-server` for registered browser sign-in, then import only the
server verifiers and identity subpaths required by the product. Run the package
and product gates before the callback is enabled in production.

## Development

```sh
bun install --frozen-lockfile --ignore-scripts
bun run check
bun run test:browser
bun pm pack --dry-run --ignore-scripts
```

`bun run check` validates the portable portfolio inventory, runs independent
ESLint and TypeScript configuration, executes deterministic and property
tests, builds the ESM entries, verifies canonical StyleX rules and deterministic
artifacts across isolated roots, scans every source and packed file, and installs the
package in clean Bundler and NodeNext consumers on React 18.3.1 and 19.2.3. It
also builds the packed React entries in a clean Next.js 16.2 webpack consumer,
which verifies that every client entry has one valid top-level directive.

`bun run test:browser` uses the built profile form and OIDC continuation under
strict Content Security Policies. It checks server-rendered light and dark
styles at compact and wide widths, native focus and readonly controls, vertical
writing, hydration, pending saves, conflict revisions, validation errors, and
save failures. It also verifies that a real cross-site callback ends before the
nonce-locked continuation starts a same-origin session request. Only the save
transport and callback provider are synthetic. The script uses an installed
browser without downloading one; set `CHROMIUM_EXECUTABLE_PATH` to select its
executable. It prints the retained temporary profile evidence directory and
closes its own browsers and loopback servers. Branch and release verification
both require this browser check.

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request. Report
suspected vulnerabilities privately as described in
[SECURITY.md](./SECURITY.md).

## License

MIT
