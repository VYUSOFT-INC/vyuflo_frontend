

// src/lib/sso.ts
import { PublicClientApplication } from "@azure/msal-browser";
import { authApi } from "../api/auth.api";

export const msalInstance = new PublicClientApplication({
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MICROSOFT_TENANT_ID}`,
    redirectUri: window.location.origin,
  },
  cache: { cacheLocation: "sessionStorage" },
});

export async function callSSOEndpoint(provider: string, providerToken: string) {
  return authApi.sso({
    provider,
    provider_token: providerToken,
    terms_accepted: true,
  });
}