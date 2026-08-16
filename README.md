# hraness/suite-accounts

`@hraness/suite-accounts` provides the client and signed-protocol boundaries
for Hraness Accounts. It validates one product's registered binding, pins every
OAuth and OIDC trust value, keeps browser bearer custody server-side, and
parses suite identity and entitlement evidence from `unknown`.

Accounts remains the sole authority for account records, OAuth client
registration, identity links, and entitlements. Installing this package does
not let a product register itself or choose an issuer, JWKS endpoint, resource,
callback, client ID, wire version, or trust algorithm.

## Install

Pin the immutable release:

```json
{
  "dependencies": {
    "@hraness/suite-accounts": "github:hraness/suite-accounts#v0.1.3"
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

## Bind a registered client

Pass the exact public fields assigned to the product. The factory rejects
unknown fields, including attempts to supply authority-controlled trust data.

```ts
import { createSuiteAccountsClientConfiguration } from
  "@hraness/suite-accounts/client-configuration";

const configuration = createSuiteAccountsClientConfiguration({
  authMode: "oidc-rp",
  callbackUrl: "https://oprte.com/api/suite-auth/callback",
  clientId: "hraness:oprte:production:v1",
  consumer: "oprte",
  environment: "production",
  origin: "https://oprte.com",
});

if (!configuration.ok) {
  throw new Error(`Invalid Accounts binding: ${configuration.error}`);
}

configuration.value.provider.issuer;
// "https://account.hraness.com"
```

The returned configuration is frozen. Its provider endpoints, resource,
configuration version, and wire version are derived from the package's frozen
v1 authority data. The Accounts service independently enforces the same
registration, so this client-side check never creates authority.

Local development still uses `parseSuiteAccountsPublicConfig`. The consumer
origin and both Accounts Convex origins must use one exact loopback hostname.
Remote configuration accepts only the checked production deployment.
Generated Vercel Preview surfaces can report their surface origin through
`NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN`, but suite authentication remains
unavailable there.

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

## Choose the narrow subpath

| Subpath | Intended runtime |
| --- | --- |
| `.` | Dependency-light configuration, registry, URL, and Convex browser-token contracts |
| `./identity` | Provider-neutral identity types, parsers, views, and signed messages |
| `./identity/functions` | Opt-in Convex function references and billing transport types |
| `./identity/return-targets` | Opt-in Accounts-owned billing return-target identifiers |
| `./client-configuration` | Additive validated product-binding factory |
| `./browser-session` | Same-origin browser session reads and serialized refresh |
| `./oidc-rp` | Server-only OAuth 2.1 relying-party implementation |
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
| `./react` | Optional route-local Accounts Convex context |

The existing `./auth-client`, `./public-config`, `./registry`, `./urls`, and
other listed suite subpaths remain available for released clients. Import
server-only modules only from server code.

## Security contract

The package preserves these checks across the public surface:

- OAuth authorization code uses S256 PKCE plus exact state and nonce checks.
- Issuer, audience, origin, callback, client ID, resource, and endpoints must
  match the registered values.
- OAuth access and refresh tokens remain in encrypted HttpOnly cookies or
  server-to-server requests. Browser session JSON never exposes bearer tokens.
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

## Frozen v1 compatibility

`SUITE_ACCOUNTS_CONSUMERS`, `SUITE_ACCOUNTS_DEPLOYMENTS`, their policy arrays,
and their lookup helpers preserve the currently live released v1 static
registry. They are deeply runtime-frozen and deprecated for new consumers.
Existing applications may use them while migrating, but new registration
remains an Accounts service change followed by a package release and an exact
factory binding. Retired client identifiers and routes are rejected.

The published v1 browser refresh-lock and session-notification channel strings
also remain unchanged in version 0.1. Existing tabs therefore coordinate
across a rolling package migration without a browser namespace cutover.

The compatibility registry is intentionally closed. It must not gain runtime
mutation, remote discovery, environment overrides, or caller-supplied trust
values.

## Service boundary

This repository does not contain billing prices or provider lookup keys,
authoritative registry writes, reconciliation jobs, email delivery, provider
credentials, webhook payloads, provider project identifiers, or product-owned
service policy. Those concerns belong to the Accounts service. The Convex
function references and billing transport types required by existing clients
are isolated behind explicit opt-in identity subpaths; the root and client
configuration entries do not load them.

## Development

```sh
bun install --frozen-lockfile --ignore-scripts
bun run check
bun pm pack --dry-run --ignore-scripts
```

`bun run check` validates the portable portfolio inventory, runs independent
ESLint and TypeScript configuration, executes deterministic and property
tests, builds the ESM entries, scans the public boundary, and installs the
package in clean Bundler and NodeNext consumers on React 18.3.1 and 19.2.3. It
also builds the packed React entries in a clean Next.js 16.2 webpack consumer,
which verifies that every client entry has one valid top-level directive.

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request. Report
suspected vulnerabilities privately as described in
[SECURITY.md](./SECURITY.md).

## License

MIT
