# Changelog

Each release is an immutable Git tag. Install a release with `"@hraness/suite-accounts": "github:hraness/suite-accounts#vX.Y.Z"`.

## Unreleased

- The v1 profile form labels the Bluesky field `Bluesky` (was `BlueSky`) and the website field `Personal website` (was `Personal Website`). Update any code or test that selects these fields by label.
- The public-profile form hint beside Links reads `optional; a handle is enough`.

## v0.9.16

Retires Elders and Subcounter from every registration surface: both products keep parseable historical identities, but neither retains an OIDC client, origin, or browser-token grant. The product Convex browser-token admission list is empty until a reviewed product is admitted.

## v0.9.15

Stops forcing `prompt=login` on ordinary authorization for email-OTP consumers so a valid live session can satisfy sign-in, and adds optional `authenticationNotBeforeMs` to `startFreshAuthentication`, mapping a server-owned freshness floor to a positive OIDC `max_age` so a sufficiently recent live session may satisfy the login prompt. Omitting it preserves the unconditional `max_age=0` re-authentication.

## v0.9.14

Retires Oompa (`hra`) from current browser registration and the membership list: its former client `hraness:hra:production:v1`, origins, and callbacks can no longer create a current binding, historical product identities, links, and receipt data stay readable, and no Accounts data is deleted. Removes Rough Day, Textbutler, and Soundfish from the membership product list and adds the `sloptrade` entry. Renames the HRANESS.COM membership description to the current organization statement, "tools for agents and humans".

## v0.9.13

Adds the OAuth 2.0 Device Authorization Grant client protocol under `./oidc-device-code`, registers Ghostget (`https://ghostget.com`) as a current-only email-code OIDC client with an exact origin and callback, and makes `deviceAuthorizationEndpoint` / `deviceTokenEndpoint` available in the closed provider configuration.

## v0.9.11

Adds Clankdar (`https://clankdar.com`) to the shared membership product list.

## v0.9.10

Registers Platonik at `https://platonik.space` as a current-only email-code OIDC client with an exact origin and callback.

## v0.9.9

Adds a one-shot just-signed-in marker on the OIDC continuation page (`consumeSuiteOidcJustSignedIn` in `browser-session`) so products can render post-auth feedback, and names the continuation page.

## v0.9.8

Adds the EDS Research index at `https://hraness.com/eds` to the shared membership product list.

## v0.9.7

Registers Soulscrape at `https://soulscrape.com` as a current-only email-code OIDC client with an exact origin and callback.

## v0.9.6

Names the personal-site membership product `hraness.com` instead of the `HRNSS` wordmark.

## v0.9.5

Retires a deleted product's current OIDC client registration; historical identities remain parseable without origin or client trust.

## v0.9.4

Registers Hraness at `https://hraness.com` as a current-only email-code OIDC client with an exact origin and callback.

## v0.8.0

Adds the optional public-profile form with explicit visibility, preserved conflict drafts, exact save-result validation, and hydration/lifetime guards. The v1 form remains compatible; consumers still own authenticated transport and activation.

## v0.7.0

Adds exact public, editor, and revision-bound update profile v2 contracts, GitHub URL normalization, and opaque avatar reference helpers. Existing six-link contracts and the React form remain unchanged; endpoint activation is separate.

## v0.6.0

Adds explicit server-only fresh authentication with sealed action context, signed authentication-time validation and separate transaction modes. Ordinary login and registered authority remain unchanged.

## v0.5.5

Adds AI Charts as a current-only, production-only, email-code browser client at `https://aicharts.io`, with client `hraness:aicharts:production:v1` and callback `https://aicharts.io/api/suite-auth/callback`. It adds no billing return, linked-product receipt, or native device grant. Frozen v1 identities and linked-product privileges remain unchanged.

## v0.5.4

Binds Oompa to `https://oompa.app` and its exact callback while preserving the `hra` consumer and client IDs. Previous production origins gain no current Accounts authority or redirect.

## v0.5.3

Renames the current `hra` registration to Oompa without changing its client ID. Its production origin is superseded by v0.5.4.

## v0.5.2

Rebuilds the unchanged profile recipes and manifest against UI v0.5.12, binding fail-fast property validation while preserving presentation-free authentication entries and optional React peers. Compiler adopters must use compatible manifests for every registered package and start a fresh generation after upgrading. The prior rollback pair is Suite Accounts v0.5.1 with UI v0.5.3.

## v0.5.1

Ends the verified OAuth callback with a nonce-locked same-origin continuation document, so the return page resolves its session without admitting a cross-site request.

## v0.5.0

Compiles the optional native profile form with StyleX, preserving public variables, semantic hooks, save behavior, and non-React authentication boundaries. Publishes a canonical compiler manifest and verifies standalone styles in a real browser.

## v0.4.2

Adds verified-account-email accessors for provisioning before optional username onboarding. Live userinfo must match subject, client, Suite account, and profile state; the accessor returns only an `email_verified` address.

## v0.4.1

Registers PeopleBlade at `https://peopleblade.com` for email-OTP OIDC. Its signed product-link receipt binds local and Suite subjects; email equality never creates or merges a link.

## v0.4.0

Removes the retired OPRTE browser client from current and deprecated registration helpers while preserving bounded historical product-ID parsing.

## v0.3.7

Moves a stable consumer registration to its renamed product origin without changing its client ID. Predecessor origins gain no Accounts authority.

## v0.3.6

Moves the current Sponge origin to `https://sponge.computer` without changing its client ID.

Releases v0.1.0 to v0.3.5 and v0.9.0 to v0.9.3 are listed on the [GitHub Releases page](https://github.com/hraness/suite-accounts/releases).
