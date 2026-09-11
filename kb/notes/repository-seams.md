---
title: Repository seams
type: concept
tags:
  - architecture
  - dependencies
  - repositories
repository_scopes:
  - AGENTS.md
  - package.json
  - src
---

# Repository seams

Suite Accounts owns the public account, client-registration, identity-link, authentication, and entitlement contracts exported by this package. Product registrations, provider credentials, billing operations, email delivery, and product-specific policy remain outside this repository.

The Result runtime is pinned to a reviewed immutable commit. Any future Hraness dependency must also use an immutable release or full commit so each consumer can upgrade independently. Do not connect development through sibling paths, Git submodules, or coordinated `main` workflows. Extract a new shared package only after two concrete consumers need the same stable, product-neutral interface.

The optional React surface remains product-neutral. Stable accessible primitives may come from `@hraness/ui`, optional reusable composition may come from `@hraness/design-kit`, and product layout and content remain with each consumer. Neither design package belongs in the runtime graph without a concrete shared requirement. The existing UI development dependency owns compilation of the profile recipes, without adding a presentation import to authentication entries. Direct compositions are development-only and must never enter packed files or production dependency graphs.

Suite Accounts v0.5.2 pairs its profile manifest with UI v0.5.12 and the compiler's fail-fast property-validation identity. Even unchanged recipes require a real manifest rebuild when that identity changes. A package-wide compiled profile remains relevant to manifest admission even when a consumer imports only a presentation-free authentication entry; that entry's runtime isolation is a separate contract. Compiler adopters keep their registered manifests compatible and start a fresh generation after an upgrade. The previous rollback pair is Suite Accounts v0.5.1 with UI v0.5.3; the OIDC continuation behavior and optional React peer boundaries remain intact.

Freeze protocol and export contracts before parallel lanes. Give registries, manifests, generated output, and lockfiles one owner while independent lanes change disjoint implementation or test paths.

The v2 public-profile form shares the existing optional presentation entry while leaving the released v1 form compatible. Explicit visibility and optimistic revisions belong in the shared interaction contract; authentication, username claiming, images, and product navigation remain consumer or Accounts authority concerns. A conflict preserves the user's draft until a deliberate replacement and never replays publication consent. Exact result validation checks consistency, not authentication. Server-rendered forms remain closed until hydration so native fallback submission cannot serialize private profile text. DOM detachment retires a pending save synchronously; Activity reconnection reports an unconfirmed outcome without resending it. These boundaries need built-form browser evidence, because static markup and pure parser tests cannot establish them.

## Related

The normative rules remain in the root `AGENTS.md`. [[documentation-ownership|Documentation ownership]] explains how those rules relate to executable contracts and this pull-based context.
