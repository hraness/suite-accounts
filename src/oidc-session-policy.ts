/**
 * Refresh a central OAuth bearer before downstream short-token issuance would
 * leave too little useful lifetime. The browser refresh coordinator and every
 * server exchange share this exact window.
 */
export const SUITE_OIDC_EARLY_REFRESH_WINDOW_MS = 30_000;
