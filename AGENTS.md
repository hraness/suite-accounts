<!-- kb:context scopes/repository--cdb4ee2aea69 -->
# Contents

- `src/identity/` contains provider-neutral identity, profile, signed-message, entitlement-protocol, and view contracts, with Convex function references and billing transport isolated behind explicit opt-in subpaths.
- `src/registry.ts`, `src/urls.ts`, and `src/client-configuration.ts` contain the frozen v1 registry and the validated steady-state product-binding factory.
- `src/oidc-rp.ts`, `src/oidc-surface-server.ts`, `src/auth-proxy.ts`, `src/browser-session.ts`, and `src/bearer-verifier.ts` contain browser and server authentication transports.
- `src/convex-browser-auth*.ts`, `src/receipt-verifier.ts`, and `src/entitlements.ts` contain bounded downstream token, receipt, replay, and authorization checks.
- `src/react.tsx`, `src/profile-form.tsx`, and `src/profile-form.css` contain the optional React surface.
- `src/*.test.ts`, `src/*.test.tsx`, and `src/*.property.test.ts` contain deterministic examples and arbitrary-input laws.
- `scripts/` contains the portable inventory validator, ESM build, public-boundary scan, and clean-consumer package smoke.
- `.github/workflows/` contains read-only branch validation and checks-gated immutable GitHub Release automation.
- `.agents/skills/` contains portable cross-repository KB and phased-execution workflows.
- `kb/` contains authored repository rationale, maintained synthesis, and implementation plans.
- `WRITING.md` and `STYLE.md` define the internal and public prose contracts.
- `package.json`, `portfolio-inventory.json`, `tsconfig.json`, `eslint.config.mjs`, and `bun.lock` contain standalone package, portfolio, and verification configuration.
- `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, and `LICENSE` contain public usage, project policy, and terms.

# Guidelines

- Use Bun 1.3.14. Keep the package source-first, ESM-only, and independently buildable without workspace protocols or private packages.
- Follow `WRITING.md` for internal prose and `STYLE.md` for public prose.
- Apply unreasonably robust programming when agent work is cheap. Model invalid states out of existence, parse every foreign value from `unknown`, and pair readable deterministic regressions with property tests for parsers, ordering, transitions, and round trips.
- Pin Hraness dependencies to reviewed immutable releases or full commits. Never connect repositories through sibling paths, Git submodules, or coordinated `main` assumptions; upgrade each consumer independently.
- Extract a shared package only after two concrete consumers require the same stable interface. Keep every shared package product-neutral and free of product imports.
- Keep the optional React profile surface product-neutral. Shared interface composition may layer accessible primitives from `@hraness/ui`, stable optional composition from `@hraness/design-kit`, and product-owned layout and content in consumers; add either dependency only for a concrete shared need.
- Keep Direct deterministic compositions and adapters development-only and outside every production dependency graph and published export.
- Freeze protocol and package interfaces before parallel lanes begin. Give registries, manifests, lockfiles, generated output, and other convergence surfaces one owner while lanes edit disjoint paths.
- Keep mandatory rules in the closest `AGENTS.md`, current procedures in `docs/`, executable contracts in types and tests, and pull-based rationale, evidence, synthesis, and plans in `kb/`.
- Pin the Result runtime to its exact immutable `v0.2.1` commit. Bun 1.3.14 cannot freshly resolve duplicate nested and direct references to the same Git tag, so package smoke must cover a consumer that also pins the public Result tag.
- Keep Accounts as the sole account, client-registration, identity-link, and entitlement authority. A consumer can bind only its registered origin, client ID, callback, and auth mode.
- Keep issuer, JWKS, resource, protocol version, wire version, client-ID format, algorithms, and security checks derived from closed package data. Never accept them from callers or discovery.
- Preserve authorization code with S256 PKCE, exact state and nonce, issuer and audience checks, encrypted HttpOnly token custody, refresh rotation, receipt validation, replay ordering, and entitlement freshness.
- Parse foreign configuration, JWT claims, profiles, keyrings, receipts, and views from `unknown`. Fail closed on malformed or stale evidence.
- Keep the active frozen v1 protocol registry behavior-compatible for released clients. Remove retired client identities from every current authority surface, preserve the published v1 browser coordination strings, mark the compatibility registry deprecated, add no new consumer through it, and put all new use through the validated factory.
- Deeply freeze every exported registry and security policy value and every returned trust configuration. Never expose mutable canonical state through arrays, nested endpoint objects, keyrings, or provider configuration.
- Keep billing prices, provider lookup keys, registry mutation, reconciliation, email delivery, provider mechanics, project identifiers, credentials, and product reservation policy outside this repository.
- Keep the root and client-configuration entries free of opt-in Convex function-reference and billing-transport dependencies. Keep browser and server entrypoints separate. Browser JSON never receives an OAuth bearer or provider subject, and browser bearers remain memory-only.
- Add a readable deterministic test for every behavior change and a property test for every parser, round trip, ordering law, or arbitrary-input invariant.
- Treat this repository as the complete public project. Public files and Git prose may refer only to its public package, paths, commands, products, and protocol values.
- Treat every packed file as scannable public input. Fail the gate when any file cannot be inspected completely, and run `bun run check` before handing off a change.
