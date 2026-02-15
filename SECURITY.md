# Security Audit & Hardening — War Room Fitness Tracker

**Audit date:** February 2025  
**Scope:** CsgoTracker (fitness) + Firebase (planning tool), Vite, Vercel deployment

---

## Summary

A comprehensive security audit was performed on the React + Firebase fitness tracking app. The app currently uses **localStorage** for the fitness tracker (CsgoTracker) and **Firebase Firestore** for the planning tool. Firebase Realtime Database rules were added for future migration.

---

## Issues Found & Fixed

### 1. Firebase Realtime Database Rules

**Severity:** Critical (when using RTDB)

- **Issue:** No `database.rules.json` existed. If migrating to Firebase RTDB, open rules would allow full read/write.
- **Fix:** Created `database.rules.json` with:
  - Deny all access at root
  - Only `/competition` path readable/writable (auth required)
  - `operatives`: validated as alphanumeric strings, max 12 chars each
  - `scores`: validate key format `date::person::activityId`, values non-negative, max 200000
  - `auth !== null` required for writes (enable Anonymous Auth in Firebase Console if needed)

### 2. Environment Variables & Secrets

**Severity:** High

- **Issue:** Firebase config was hardcoded in `firebase.js`; admin password hardcoded in `CsgoTracker.jsx`.
- **Fix:**
  - `.env.example` created with placeholder values (no real credentials)
  - `firebase.js` now reads from `import.meta.env.VITE_*`
  - Admin password moved to `VITE_ADMIN_PASSWORD`; if unset, admin features disabled
  - `.env` already in `.gitignore` and will not be committed

**VITE_ exposure:** Firebase API keys are safe to expose client-side when restricted by Security Rules. Configure Firebase Console > Project Settings > API restrictions to limit usage.

### 3. Input Validation & Sanitisation

**Severity:** High

- **Issue:** Operative names: only `.toUpperCase()` was used; no alphanumeric or length validation. Score inputs: `parseFloat` without bounds, NaN/Infinity checks, or activity-specific limits.
- **Fix:**
  - Operative names: regex `/^[A-Za-z0-9]+$/`, max 12 chars; input strips invalid chars on change
  - `sanitiseOperativeName()` rejects names with Firebase-invalid chars: `/`, `.`, `$`, `[`, `]`, `#`
  - `parseAndValidateScore()`: `Number.isFinite()`, non-negative, activity-specific bounds (steps 200000, sleep 24, hydration 30, workouts 100, streak 7)
  - Rejects `NaN`, `Infinity`, `"1e999"`, negative values, and absurdly large numbers

### 4. Client-Side Data Integrity

**Severity:** Medium

- **Issue:** `resetAll` could be triggered by a single confirm; no double-confirm.
- **Fix:** Added double confirmation before reset.
- **Note:** `activeUser` filter is UI-only; when using Firebase RTDB, rules enforce `auth !== null` and data structure. Per-user write enforcement would require Firebase Auth with user IDs in the data model.

### 5. XSS & Injection

**Severity:** Medium

- **Issue:** Operative names in score keys (`date::person::activityId`) could contain path traversal chars if not sanitised.
- **Fix:** `sanitiseOperativeName()` rejects names with Firebase-invalid chars. No `dangerouslySetInnerHTML` usage; React JSX escaping handles dynamic content.

### 6. Deployment & Network

**Severity:** Medium

- **Issue:** Source maps could expose source in production; Vercel may serve `.env` if misconfigured.
- **Fix:** `vite.config.js` sets `sourcemap: false` for production builds.
- **Vercel:** Ensure `.env` is not in the repo; use Vercel env vars for secrets.
- **Firebase:** Use HTTPS only (Firebase SDK enforces this).

### 7. npm audit

**Severity:** Low (moderate)

- **Issue:** 10 moderate vulnerabilities in `undici` (transitive via Firebase).
- **Status:** `npm audit fix` does not resolve; Firebase SDK pins these. Undici is used for Node.js Fetch; the client-side app runs in the browser and does not use undici directly. These are primarily Node.js runtime risks. Monitor Firebase releases and upgrade when fixes are available.

---

## Residual Risks

1. **Admin password:** Client-side only; stored in env and exposed in the bundle. Use a strong password and treat admin as low-privilege (e.g. delete players, reset data).
2. **localStorage:** Fitness tracker data is per-device; no server-side backup or sync. Consider migrating to Firebase RTDB for multi-device sync.
3. **Firebase Auth:** `database.rules.json` requires `auth != null`. Enable Anonymous Auth in Firebase Console if you want unauthenticated users to write; otherwise use Email/Google sign-in.
4. **Firestore rules:** The planning tool uses Firestore, not RTDB. Add Firestore security rules in Firebase Console to restrict `rooms` collection access.

---

## Files Modified

| File | Changes |
|------|---------|
| `database.rules.json` | Created (Firebase RTDB rules) |
| `.env.example` | Created (placeholder env vars) |
| `src/firebase.js` | Use env vars, remove hardcoded config |
| `src/CsgoTracker.jsx` | Input validation, sanitisation, env-based admin password, double-confirm reset |
| `vite.config.js` | `sourcemap: false` for production |
| `SECURITY.md` | This document |

---

## Checklist for Deployment

- [ ] Copy `.env.example` to `.env` and fill with real values
- [ ] Set `VITE_ADMIN_PASSWORD` for admin access
- [ ] Deploy `database.rules.json` to Firebase RTDB (if using RTDB)
- [ ] Configure Firebase Security Rules in Console
- [ ] Set Vercel env vars (do not commit `.env`)
- [ ] Enable Firebase Anonymous Auth if required by rules
