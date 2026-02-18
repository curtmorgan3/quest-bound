# Onboarding Feature

## Overview

First-time (or any user who hasn’t completed onboarding) sees a **persistent tutorial panel** in the bottom-left after sign-in. The panel stays open on all pages until the user dismisses it (Finish or X), so they can interact with the app while following the steps. Steps can have multiple substeps; navigation is independent (step dots + Back/Next for substeps). Completion is stored per user in IndexedDB via idb-keyval.

---

## Current architecture (do not overwrite)

Refactor moved **tutorial content and step building** out of the panel. Preserve this structure:

### Content & types

- **Tutorial content**: `src/content/tutorials/onboarding.ts` — exports `onboardingTutorial: Tutorial`. Step/substep definitions live here; CTAs use `TutorialAction` (e.g. `{ type: 'link', href: '/rulesets' }` or external URL). Uses `DOCS_URL` and `DISCORD_URL` from `@/constants`.
- **Content barrel**: `src/content/index.ts` → `./tutorials`; `src/content/tutorials/index.ts` → `./onboarding`.
- **Constants**: `src/constants.ts` — `DOCS_URL`, `DISCORD_URL`.
- **Types**: `src/types/helper-types.ts` — `Tutorial`, `TutorialAction`, `OnboardingStep`, `OnboardingSubstep`, `OnboardingStepCta`. `OnboardingStep` has optional `selector?: string` (CSS selector; when on that step, matching elements are highlighted). `TutorialAction` is `{ type: 'link'; href?: string }`. `OnboardingStepCta.action` is a `TutorialAction` (not a function) in the content; it gets turned into a function by `buildTutorial`.

### Building the tutorial

- **Builder**: `src/components/onboarding/build-tutorial.ts` — `buildTutorial({ tutorial, navigate })` takes a `Tutorial` and `navigate`, returns steps with substeps where each CTA’s `action` is replaced by a function (link → `navigate(href)` or `window.open(href)` for external). Do not put raw step arrays or URL constants back into the panel.

### Panel UI & highlight

- **Panel**: `src/components/onboarding/onboarding-panel.tsx` — Gets steps via `buildTutorial({ navigate, tutorial: onboardingTutorial })` from `@/content`. No inline step definitions, no hardcoded DOCS_URL/DISCORD_URL. Single footer row: Back (left) | step number dots (center) | Next/Finish (right). No “Skip all” button; no separate “Step” prev/next row. X in header dismisses. Renders `OnboardingHighlight` with `currentStep.selector` when the step has a selector.
- **Highlight**: `src/components/onboarding/onboarding-highlight.tsx` — Accepts `selector: string | undefined`. When set, runs `querySelectorAll(selector)` (so comma-separated selectors are supported), measures each element’s rect, and renders fixed-position boxes (portal to body) with a 2px primary-colored ring and padding. Listens to scroll/resize (and ResizeObserver on body) to keep rects in sync. z-index 40 (below panel at 50). Use `data-testid` (e.g. `nav-rulesets`, `nav-dice`, `nav-help`) in the app for targets; add optional `selector` on steps in `onboarding.ts`.

### Other

- **Hook**: `src/components/onboarding/onboarding-dialog.tsx` — Only `useOnboardingStatus(userId)`.
- **Exports**: `src/components/onboarding/index.ts` — `useOnboardingStatus`, `OnboardingPanel`.

---

## Implementation (reference)

- **Storage**: `src/utils/onboarding-storage.ts` — key `qb.onboardingCompleted.${userId}`. `hasCompletedOnboarding`, `setOnboardingCompleted`, `clearOnboardingCompleted`.
- **Store**: `src/stores/onboarding-store.ts` — `forceShowAgain` / `setForceShowAgain`.
- **Layout**: Renders `OnboardingPanel` when `showOnboarding`; on close, calls `refetch()`.
- **User settings**: “Show intro again” calls `setForceShowAgain(true)`.

## Re-running onboarding

- User Settings: “Show intro again”.
- Code/tests: `clearOnboardingCompleted(userId)` from `@/utils/onboarding-storage`.
