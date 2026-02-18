# Onboarding Feature

## Overview

First-time (or any user who hasn’t completed onboarding) sees a **persistent tutorial panel** in the bottom-left after sign-in. The panel stays open on all pages until the user dismisses it (Finish, Skip all, or X), so they can interact with the app while following the steps. Completion is stored per user in IndexedDB via idb-keyval.

## Implementation

- **Storage**: `src/utils/onboarding-storage.ts` — key `qb.onboardingCompleted.${userId}` (idb-keyval). `hasCompletedOnboarding`, `setOnboardingCompleted`, `clearOnboardingCompleted`.
- **Store**: `src/stores/onboarding-store.ts` — `forceShowAgain` / `setForceShowAgain` for “Show intro again” from user settings.
- **Panel**: `src/components/onboarding/onboarding-panel.tsx` — Fixed bottom-left card (z-50, ~380px wide). 5 steps: Rulesets; Attributes/Actions/Items; Windows & Pages; Scripts & Dice; Help & Resources. Optional CTAs per step. Back / Next (or Finish) / Skip all; X button dismisses (same as Skip all). Uses Card UI; does not block the rest of the page.
- **Hook**: `src/components/onboarding/onboarding-dialog.tsx` — Exports only `useOnboardingStatus(userId)` (hasCompleted, isLoading, refetch).
- **Layout**: `src/components/layout.tsx` — Renders `OnboardingPanel` when `showOnboarding` (first time or forceShowAgain). Panel is rendered inside the main app shell so it appears on every route until dismissed. On close, calls `refetch()`.
- **User settings**: `src/pages/settings/user-settings.tsx` — “Show intro again” calls `setForceShowAgain(true)` so the panel appears again.

## Flow

1. User signs in → Layout mounts with `currentUser`. If `!hasCompleted` or `forceShowAgain`, the tutorial panel is shown in the bottom-left. User can navigate the app (rulesets, characters, etc.) while reading steps and using CTAs.
2. User clicks Finish, Skip all, or X → `setOnboardingCompleted(userId)`, `setForceShowAgain(false)`, `onClose()` (refetch). Panel unmounts and won’t show again unless “Show intro again” is used.
3. “Show intro again” in User Settings sets `forceShowAgain(true)`; panel appears again on the next render.

## Re-running onboarding

- From User Settings: “Show intro again”.
- To reset for a user in code/tests: use `clearOnboardingCompleted(userId)` from `@/utils/onboarding-storage`.
