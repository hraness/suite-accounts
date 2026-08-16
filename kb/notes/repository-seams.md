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

The optional React surface remains product-neutral. Stable accessible primitives may come from `@hraness/ui`, optional reusable composition may come from `@hraness/design-kit`, and product layout and content remain with each consumer. Neither design package belongs here until a concrete shared requirement justifies the edge. Direct compositions are development-only and must never enter packed files or production dependency graphs.

Freeze protocol and export contracts before parallel lanes. Give registries, manifests, generated output, and lockfiles one owner while independent lanes change disjoint implementation or test paths.

## Related

The normative rules remain in the root `AGENTS.md`. [[documentation-ownership|Documentation ownership]] explains how those rules relate to executable contracts and this pull-based context.
