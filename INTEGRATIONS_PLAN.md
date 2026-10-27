# Becoming: Future Authenticated Integrations Architecture Plan

This document details the production architecture for transitioning Becoming from client-side public integration to secure, serverless-backed authenticated integrations (GitHub and Google Calendar), deployed on Vercel.

---

## 1. Architectural Overview

Becoming's frontend remains an ultra-fast static single-page application. When authenticated integrations are enabled, external API calls requiring secret keys are proxied through serverless edge/lambda functions located in the `/api` directory on Vercel.

```text
Browser (Becoming SPA)
   │
   ├─► Public GitHub Events API (Direct, unauthenticated, rate-limited)
   │
   └─► Vercel Serverless Functions (/api/*)
          │
          ├─► GitHub App / OAuth Flow (/api/auth/github/*)
          │      └── Environment: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
          │
          └─► Google Calendar API (/api/auth/google/*)
                 └── Environment: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
```

---

## 2. Google Calendar Read-Only Integration

### Objective
Synchronize academic timetables, exam blocks, and study periods into Becoming without granting permission to create, modify, or delete calendar events.

### Requested Scope
- `https://www.googleapis.com/auth/calendar.events.readonly`

### Authorization Workflow
1. **Initiation (`/api/auth/google/login`):**
   - Generates a cryptographically random `state` token (stored in a short-lived `HttpOnly`, `SameSite=Lax`, `Secure` cookie).
   - Redirects the user to Google's OAuth 2.0 authorization endpoint with:
     - `client_id`: Read from `GOOGLE_CLIENT_ID`
     - `redirect_uri`: `https://<domain>/api/auth/google/callback`
     - `response_type`: `code`
     - `scope`: `https://www.googleapis.com/auth/calendar.events.readonly`
     - `access_type`: `offline` (for refresh token)
     - `prompt`: `consent`
     - `state`: CSRF protection token

2. **Callback Handling (`/api/auth/google/callback`):**
   - Compares the returned `state` parameter against the cookie. If mismatched, returns HTTP 403.
   - Exchanges the authorization `code` with Google's token endpoint via a server-to-server POST request, passing `GOOGLE_CLIENT_SECRET`.
   - Encrypts the resulting `refresh_token` using AES-256-GCM with a server-side `ENCRYPTION_KEY`.
   - Returns a secure, scoped session cookie to the browser.

3. **Event Retrieval (`/api/calendar/events`):**
   - Validates user session.
   - Decrypts refresh token and obtains a temporary access token.
   - Queries Google Calendar API for events within the active 65-day boundary (Oct 27 to Dec 31, 2026).
   - Returns sanitized event titles, start times, and end times to the frontend.

4. **Revocation & Disconnect (`/api/auth/google/disconnect`):**
   - Calls `https://oauth2.googleapis.com/revoke` to invalidate tokens.
   - Clears session cookies and updates frontend status to `disconnected`.

---

## 3. GitHub App / Authenticated GitHub Integration

### Objective
Allow private contribution statistics or verified commits without exposing personal access tokens in browser memory.

### Preferred Mechanism
A GitHub App or fine-grained OAuth App rather than broad personal access tokens.

### Permissions
- **Repository permissions:** Metadata (read-only), Commit statuses (read-only).
- No write access to code, pull requests, or issues.

### Endpoints
- `GET /api/auth/github/login`: Redirects to `https://github.com/login/oauth/authorize`.
- `GET /api/auth/github/callback`: Validates state, exchanges code for access token via `GITHUB_CLIENT_SECRET`.
- `GET /api/github/activity`: Proxies authenticated activity requests with 5,000 requests/hour rate limit (compared to 60/hr for unauthenticated IPs).
- `POST /api/auth/github/disconnect`: Invalidates token and removes server session.

---

## 4. Android Digital Wellbeing Companion App

### Architecture
- **No Cloud Bridge Needed:** Direct browser access to Android OS metrics is blocked by Android platform sandboxing.
- **Companion App (Native Kotlin):**
  - Uses Android `UsageStatsManager`.
  - Requires user approval under `Settings > Apps > Special app access > Usage access`.
  - Aggregates daily app package foreground time into a lightweight JSON file or local QR code.
  - User imports this file directly via Becoming's **Settings > Import App Data** without sending usage habits to external servers.

---

## 5. Required Environment Variables for Future Vercel Backend

The future Vercel serverless functions require the following environment variables. None of these are ever exposed in client-side bundles:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.vercel.app/api/auth/google/callback

# GitHub OAuth / App
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=https://your-domain.vercel.app/api/auth/github/callback

# Token Encryption
SESSION_SECRET=32-byte-cryptographically-random-hex-string
TOKEN_ENCRYPTION_KEY=32-byte-hex-key-for-aes-256-gcm
```

---

## 6. Security Guarantees

1. **Zero Secret Leakage:** No API secrets, client secrets, or private tokens exist in `app.js` or `integrations.js`.
2. **Read-Only Scopes:** Third-party integrations will never request write, delete, or management permissions.
3. **No Database Requirement Until Multi-Device Sync:** Tokens can be stored in encrypted HTTP-only cookies, eliminating the need to maintain an operational database server for single-user accounts.
