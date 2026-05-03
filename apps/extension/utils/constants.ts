// Hardcoded production URLs that don't change between dev and prod builds.
// The webHost helper returns the API origin for the current build (so dev
// can point at localhost), but legal pages always live at the canonical
// locker.dev origin — even when the extension is hitting a dev backend.
export const PRIVACY_POLICY_URL = "https://locker.dev/extension/privacy";
