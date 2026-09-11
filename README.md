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
    "@hraness/suite-accounts": "github:hraness/suite-accounts#v0.8.0"
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

Version 0.5.5 adds the current-only AI Charts browser registration at
`https://aicharts.io`, with client `hraness:aicharts:production:v1` and callback
`https://aicharts.io/api/suite-auth/callback`. It requires email-code sessions
and adds no billing return, linked-product receipt, or native device grant.
Accounts service adoption and product activation are separate from this
package contract; a valid factory binding is not proof of live sign-in.

Version 0.5.4 binds the current Oompa registration to
`https://oompa.app`. The stable `hra` consumer ID and
`hraness:hra:production:v1` client ID remain unchanged, so existing identity
links, receipts, and stored evidence stay compatible. A product binding must
supply the `https://oompa.app` origin and callback. Previous production
origins have no current Accounts authority or compatibility redirect.

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
  callbackUrl: "https://oompa.app/api/suite-auth/callback",
  clientId: "hraness:hra:production:v1",
  consumer: "hra",
  environment: "production",
  origin: "https://oompa.app",
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

## Public profile v2 contracts

The `./profile` and `./identity` entries export additive v2 parsers. Existing
six-link profile contracts and `SuiteProfileForm` keep their v1 behavior.

| Parser | Exact fields |
| --- | --- |
| `parseSuitePublicProfileV2` | `schemaVersion`, `accountId`, `username`, `name`, `bio`, `links`, `avatarRef`, `revision` |
| `parseSuiteProfileEditorV2` | Public fields plus `publication`; `username` can be `null` |
| `parseSuiteProfileUpdateV2` | `schemaVersion`, `expectedRevision`, `name`, `bio`, `links`, `avatarRef`, `publication` |

Every v2 object has `schemaVersion: 2`. Public and editor projections require
canonical saved values. Edits normalize names, biographies, and the existing
six social links, and add a seventh `github` link. All seven link keys are
required; absent values are `null`. Results and nested links are owned and
frozen. Unknown fields, symbols, accessors, and malformed values return fixed
field/reason errors without echoing the input.

Public names must be explicitly saved and nonempty. These parsers do not infer
names from authentication data. Names allow 120 UTF-16 code units and biographies
allow 1,000 after normalization; each raw text input is limited to 32,768 code
units. URLs are limited to 2,048 code units before and after normalization.
HTTP adapters must separately bound the full request body.

Public revisions start at one. Editor revision zero is a private blank default:
empty name and biography, null links and avatar, and either a claimed canonical
username or `null`. Saved editor profiles require a nonempty name; published
ones also require a username. Revisions are nonnegative safe integers. The
authority must enforce optimistic revision matching and refuse overflow.
Editor publication is `private` or `published`; edits request `private` or
`publish`. Parsing a public projection does not authenticate its source or
grant permission to publish it.

`normalizeSuiteProfileLinkV2("github", value)` accepts an HTTPS URL on
`github.com` or `www.github.com` with one ASCII profile path of one to 100
letters, digits, underscores, or hyphens. It canonicalizes the host and path
to lowercase and removes an optional trailing slash. It rejects ports,
credentials, whitespace, escapes, queries, and fragments. This is a bounded
URL policy, not proof that a GitHub account exists or belongs to the user.

`parseSuiteAvatarRef` accepts `avref_` followed by 64 lowercase hexadecimal
characters with a nonzero suffix. `suiteProfileAvatarPublicUrl` and
`suiteProfileAvatarEditorUrl` derive distinct `.webp` paths from that reference
at the fixed Accounts origin. These helpers perform no requests and establish
neither ownership nor endpoint availability. The serving service must enforce
owner access on the editor route and current publication consent on the public
route, and serve only server-reencoded static WebP images. Withdrawing consent
can stop serving an image; it cannot erase copies already downloaded.

Profile and avatar contracts are separate from numeric usage data. Usage-upload
credentials do not authorize profile or avatar changes. Installing these
contracts does not activate profile publication, editing, or image hosting.

### Optional public-profile form

The existing `./profile-form` entry also exports `SuitePublicProfileForm`,
`SuitePublicProfileFormProps`, and `SuitePublicProfileFormResult`. Import the
same stylesheet as the v1 form. No new React, authentication, or styling
dependency is required.

```tsx
<SuitePublicProfileForm
  initialProfile={editor}
  onSave={saveThroughAuthenticatedAccountTransport}
  onSaved={handleConfirmedProfile}
/>
```

`initialProfile` is a canonical `SuiteProfileEditorV2`. `onSave` receives only
the exact revision-bound `SuiteProfileUpdateV2` and returns an unknown result
for runtime validation. Successful and conflict results contain exactly
`{ status, profile }`. The form also recognizes the exact singleton statuses
`unauthorized`, `username_required`, and `invalid_avatar`. It rejects malformed,
cross-account, mismatched-content, or impossible-revision results without
echoing their contents. These checks do not authenticate the transport.

The form edits name, biography, and all seven social links. It preserves the
authority's avatar reference without rendering an upload control or fetching
an image. Public text never defaults to sign-in name or email. Missing username
disables publication but allows a private save. A saved profile needs a name.

Visibility is a native radio choice applied on save. Buttons distinguish
publishing, saving publicly, saving privately, and withdrawing publication.
A conflict preserves the rejected draft until the user chooses **Load latest
profile**. Loading replaces the draft and clears its visibility choice;
another save requires a fresh choice. The form never retries automatically.
An unconfirmed save preserves the draft and reports that uncertainty separately
from the last confirmed state. Consumer callback failure cannot change a
confirmed save into an unconfirmed one.

Treat the initial snapshot and save callbacks as mount-scoped. Changing an
account ID remounts the editor; same-account prop updates do not overwrite a
draft or retarget its transport. The consumer must unmount on logout or a
session change and explicitly remount when the user chooses to reload. Retired
instances discard late results and callbacks. React Activity reconnection
preserves the draft and marks an abandoned save unconfirmed without resending
it. Transport promises still belong to the caller; retiring the form does not
cancel an already-dispatched server operation.

Server-rendered controls stay disabled until hydration. Private fields have no
native submission names, and the form uses POST as a further URL-leak guard.
JavaScript is required to edit and save. These browser controls complement,
but never replace, server authentication, revision checks, and consent policy.

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

## Fresh authentication for server-owned actions

Use the explicit `startFreshAuthentication(request, input)` and
`completeFreshAuthentication(request)` methods from `./oidc-rp` when a product
action needs recently authenticated account evidence. Both methods are
server-only. The existing surface handler does not opt into this flow.

Pass exactly `{ context, expiresAtMs }` as the start input. `context` is an opaque
32–256 character value using only ASCII letters, digits, `_` and `-`.
Create it on the product server and bind it to a durable, short-lived action;
do not copy browser parameters, personal data or credentials into it.
`expiresAtMs` must be a safe integer after server time and no more than 10
minutes ahead. The request still uses the exact registered start URL, method
and same-origin rules. The context is encrypted in the transaction cookie and
is not added to the authorization URL, continuation HTML or browser session.

The fresh transaction uses a separate version. Ordinary `callback()` and
`handle()` reject it, including when rolling back to an older package.
`completeFreshAuthentication()` rejects ordinary login transactions. Route the
callback explicitly on the product server; do not retry it through ordinary
login after a rejection.

A successful completion returns `{ kind: "authenticated", authentication,
response }`. Its frozen `authentication` projection contains only `context`,
`suiteAccountId`, `authenticatedAtMs`, `startedAtMs` and `expiresAtMs`.
Authentication time comes from verified signed `auth_time`, not token issuance
or session refresh. It must fall between the start's whole-second boundary and
current server time, with no positive skew allowance. Same-second ordering
cannot be inferred from a seconds-precision claim. Validity ends at the earliest
transaction, ID-token or access-token expiry and is checked again after provider
work. Missing or invalid evidence returns `{ kind: "rejected", response }` with
a fixed error and cleared transaction cookie.

Consume this result on the server. Never serialize the result or its context
into browser JSON or an application URL. Recheck expiry and atomically bind the
context, current account and intended action in product-owned durable state
before returning `response`. The response carries the normal encrypted session
cookie and same-origin continuation. A browser session, this evidence, or a
recent OTP in another flow does not itself approve a device or authorize an
action. Keep explicit user approval and replay protection separate.

Completion has no exactly-once guarantee and invokes no product hook. A lost
response may leave a consumed OAuth code; reconcile durable product state and
start a new transaction instead of assuming the code can be replayed. Ordinary
login, session access and refresh cannot produce fresh completion evidence.

The SDK requests `prompt=login` and `max_age=0`, then independently checks the
signed result. Request parameters alone are insufficient evidence. See
[OIDC authentication-time validation](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation).
Qualify the authority's authentication-time semantics and the product's durable
approval flow before activating privileged actions.

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

Pin the immutable `v0.8.0` release for this package version.
Previously published immutable releases remain unchanged:

| Release | Checked change |
| --- | --- |
| `v0.8.0` | Adds the optional public-profile form with explicit visibility, preserved conflict drafts, exact save-result validation, and hydration/lifetime guards. The v1 form remains compatible; consumers still own authenticated transport and activation. |
| `v0.7.0` | Adds exact public, editor, and revision-bound update profile v2 contracts, GitHub URL normalization, and opaque avatar reference helpers. Existing six-link contracts and the React form remain unchanged; endpoint activation is separate. |
| `v0.6.0` | Adds explicit server-only fresh authentication with sealed action context, signed authentication-time validation and separate transaction modes. Ordinary login and registered authority remain unchanged. |
| `v0.5.5` | Adds AI Charts as a current-only, production-only, email-code browser client with an exact origin and callback. Frozen v1 identities and linked-product privileges remain unchanged. |
| `v0.5.4` | Binds Oompa to `https://oompa.app` and its exact callback while preserving the `hra` consumer and client IDs. Previous production origins gain no current Accounts authority or redirect. |
| `v0.5.3` | Renames the current `hra` registration to Oompa without changing its client ID. Its production origin is superseded by v0.5.4. |
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

The public-profile browser fixture uses the same built optional entry. It
checks pre-hydration closure, publication and withdrawal, conflicts, manual
retry, double submission, account replacement during commit, and Activity
hide/show recovery with synthetic save transport only.

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request. Report
suspected vulnerabilities privately as described in
[SECURITY.md](./SECURITY.md).

## License

MIT
