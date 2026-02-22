# Feature Flags

Feature flags are stored in localStorage under `feature.{name}` (values `"true"` or `"false"`). Toggle them in **Dev Tools** (when `localStorage['dev.tools'] === 'true'`).

## Worlds and campaigns

- **`worlds`** – When disabled: nav item "Worlds" is hidden and all `/worlds/*` routes are removed (those URLs 404).
- **`campaigns`** – When disabled: nav item "Campaigns" is hidden and all `/campaigns/*` routes are removed.

Both default to **disabled** (`useFeatureFlag('worlds', false)` and `useFeatureFlag('campaigns', false)`). Enable in Dev Tools (Feature Flags) to show the nav items and routes.
