---
title: Fresh OIDC completion with sealed action context
type: plan
area: authentication
status: in-progress
---

# Fresh OIDC completion with sealed action context

## Outcome and scope

Add a generic, opt-in server-only relying-party flow that returns recently
authenticated account evidence bound to a bounded product action. Preserve
ordinary login, the authority registry, cookie custody and package boundaries.
[Issue 35](https://github.com/hraness/suite-accounts/issues/35) records the
pre-implementation contract. No public route, account enrollment, privileged
action, provider deployment or product activation belongs to this package slice.

## Decision

| Approach | Tradeoff |
| --- | --- |
| Awaited product callback hook | Introduces side effects and uncertain storage timeouts inside the SDK. |
| Explicit server-only completion result | Keeps verified evidence and product-owned durable consumption separate; the caller must handle rejection and response delivery. |

Use the explicit result. Fresh transactions are version 2, while ordinary
transactions retain version 1. Each completion method rejects the other mode
before provider requests; old SDK versions reject version 2. A bounded opaque
context and deadline are sealed with state, nonce and PKCE. Verified signed
authentication time must be no earlier than the start's whole-second boundary
and no later than server time. Token issuance and refresh are not substitutes.
The completion validity is capped by transaction, ID-token and access-token
expiry, including provider work elapsed before returning.

## Implementation and verification

1. Root owns `src/oidc-rp.ts`, public documentation, manifests, generated output,
   package smoke and integration. A focused test worker owns the new synthetic
   ES256 fixture suite; an independent reviewer owns security review.
2. Preserve the ordinary OIDC tests; add readable and arbitrary-input regressions
   for exact bounded input, cookie tampering, cross-mode rejection, signed claim
   errors, identity mismatches, time boundaries, context ownership and response
   loss. Provider requests and clocks are injected, never live.
3. Run focused tests and types, then the complete package and browser gates after
   convergence. Rebuild tracked distribution through the package generator.
   Finish KB percolation, refresh and check serially.
4. Review current-head CI and unresolved threads, squash through the documented
   PR gate, then publish and verify the matching immutable release before any
   consumer pin changes.

## Recovery and limits

A typed result is not an authorization, consumed-state receipt, single-use OTP
proof or distributed transaction. The product must recheck current account and
expiry, durably consume context, handle concurrency and obtain explicit consent.
Lost callback responses can consume the OAuth code. Reconcile product state and
start again; never retry as ordinary login. Provider authentication-time semantics
and product activation require their own relevant evidence.

The installed managed-guidance adopter refuses the existing mixed legacy/current
blocks. Its check was run and refused before implementation. Preserve the guard
and unmanaged rules; do not append another managed block or silently consolidate.
This exception does not waive source, review, package, CI or release gates.

## Progress

The first implementation passed TypeScript and all 11 existing OIDC tests with
121 assertions. The new focused suite passed 82 tests with 1,689 assertions,
including three 200-run property tests and consumed-code response loss. Review
found that ordinary JWT skew could admit future `nbf` values; fresh ID and access
verification now uses zero skew while ordinary behavior stays unchanged. The
tests exercise both future token-not-before cases and future access issuance.

The built profile browser suite passed seven scenarios and three native submits.
The built fresh and ordinary OIDC flows also passed, then review added explicit
fresh-page error observation, a frozen-evidence assertion and refresh-token
privacy coverage. The updated browser check and full package gate remain due.
Production, authority state and consumer pins are unchanged.
