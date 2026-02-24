/** Supported social / OAuth providers in the app. */
export const AUTH_PROVIDERS = {
  google: { label: "Google" },
  facebook: { label: "Facebook" },
} as const;

export type AuthProviderKey = keyof typeof AUTH_PROVIDERS;
