---
version: 1
slug: "src-public-profile-form-tsx"
primary_target: "src/public-profile-form.tsx"
related_targets: ["src/profile-form.tsx","src/profile-form.stylex.ts"]
---

# Public profile editor

Operate. Extend the existing shared profile form for people editing the profile they may publish across Hraness products. Keep the released v1 form, native controls, optional React boundary, compiled styles, and seven theme variables intact. Publication is an explicit, revision-bound choice; conflicts never replay consent. Do not invent avatar upload or prefill public fields from private sign-in data.

## Direction contract

THESIS: Make the difference between a saved private draft and a published profile visible at the save decision.

OWN-WORLD: Inherit the shared form's typography, neutral input surfaces, focus rings, spacing, and caller-owned theme. No new brand, cards, icons, or animation.

STORY: Edit public-facing details and social links, choose visibility, and save. A conflict loads the current profile and requires a fresh publication choice.

FIRST VIEWPORT: A single-column form starts with name and biography, followed by labeled social fields. Visibility and the committing action end the form together. Errors stay beside their controls; the current publication state is separate from an unsaved choice.

FORM: Local extension of the established native form, shaped directly; no concept seed applies.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

For this ordinary extension, finish documentation verifies the incumbent design without rewriting it. No raster ships.
