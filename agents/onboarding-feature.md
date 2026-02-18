# Onboarding Feature

## Overview

First-time (or any user who hasn’t completed onboarding) sees a 5-step dialog after sign-in. Users can skip all, go through steps with Next/Back, or finish. Completion is stored per user in IndexedDB via idb-keyval.

## Implementation

- **Storage**: `src/utils/onboarding-storage.ts` — key `qb.onboardingCompleted.${userId}` (idb-keyval). `hasCompletedOnboarding`, `setOnboardingCompleted`, `clearOnboardingCompleted`.
- **Store**: `src/stores/onboarding-store.ts` — `forceShowAgain` / `setForceShowAgain` for “Show intro again” from user settings.
- **Dialog**: `src/components/onboarding/onboarding-dialog.tsx` — 5 steps (Rulesets; Attributes/Actions/Items; Windows & Pages; Scripts & Dice; Help & Resources). Optional CTAs per step (e.g. Go to Rulesets, Open documentation, Join Discord). Uses Radix Dialog.
- **Layout**: `src/components/layout.tsx` — Renders `OnboardingDialog` when `!onboardingLoading && currentUser && (forceShowAgain || !hasCompleted)`. On close, calls `refetch()` so `hasCompleted` updates.
- **User settings**: `src/pages/settings/user-settings.tsx` — “Show intro again” button calls `setForceShowAgain(true)` so the dialog opens on next render.

## Flow

1. User signs in → Layout mounts with `currentUser`. `useOnboardingStatus(userId)` loads `hasCompleted` from idb. If false (or `forceShowAgain`), dialog opens.
2. User completes or skips → `setOnboardingCompleted(userId)`, `setForceShowAgain(false)`, `onClose()` (Layout’s `refetch()`). Dialog closes and won’t show again for that user unless they click “Show intro again.”
3. “Show intro again” in User Settings sets `forceShowAgain(true)`; dialog opens again. Completing/skipping clears the flag and sets completed in idb as above.

## Re-running onboarding

- From User Settings: “Show intro again” (no need to clear idb; `forceShowAgain` overrides).
- To reset for a user in code/tests: use `clearOnboardingCompleted(userId)` from `@/utils/onboarding-storage`.
