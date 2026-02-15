# Security Audit & Hardening — War Room Fitness Tracker

You are a senior application security engineer. Perform a comprehensive security audit of this React + Firebase Realtime Database fitness tracking app and fix every issue you find. The app uses Vite, deploys to Vercel, and stores all data in Firebase RTDB with real-time subscriptions. There is no server-side code — it is entirely client-side with Firebase as the backend.

## 1. Firebase Realtime Database Rules

Examine `database.rules.json`. The current rules are likely too permissive (e.g. `.read: true, .write: true` or similar open rules). Fix this by implementing proper security rules that:

- Restrict reads and writes to the `/competition` path only — deny access to all other paths.
- Add data validation rules ensuring `operatives` is a list of strings (max 10 items, each max 12 characters), and `scores` values are non-negative numbers within sane bounds (e.g. steps max 200000, sleep max 24, etc.).
- Prevent writes that would delete the entire database root or inject unexpected child nodes.
- Add `.validate` rules for the score key format (`date::person::activityId`).
- Consider whether anonymous Firebase Authentication should be enabled to gate access — if so, implement it end-to-end (Firebase console instructions, client-side auth flow, and rules using `auth !== null`).

## 2. Environment Variables & Secrets

Audit how Firebase credentials are handled. Check that:

- No API keys, project IDs, or database URLs are hardcoded in source files — they must come from `.env` only.
- The `.env` file is in `.gitignore` and will never be committed.
- The `.env.example` file contains only placeholder values, not real credentials.
- Vite's `VITE_` prefix exposure is understood — document which env vars are safe to expose client-side and which are not (Firebase API keys are generally safe as they are restricted by Firebase Security Rules, but confirm this is correctly configured).

## 3. Input Validation & Sanitisation

Review every user input in `App.jsx`:

- Operative names: enforce alphanumeric characters only (no HTML, scripts, or special characters). Add regex validation. Current `.toUpperCase()` is not sufficient.
- Score inputs: validate they are finite positive numbers within realistic bounds before writing to Firebase. Reject NaN, Infinity, negative values, and absurdly large numbers.
- Ensure no input value is ever rendered as raw HTML (check for `dangerouslySetInnerHTML` usage — there should be none).
- Confirm `parseFloat` edge cases are handled (e.g. strings like "1e999", "0x1F", leading/trailing whitespace).

## 4. Client-Side Data Integrity

- Check that one user cannot overwrite another user's scores. Currently the app filters edits by `activeUser`, but verify this is enforced in Firebase rules too, not just UI-side.
- Verify the `resetAll` / data purge function cannot be triggered by injecting a call — consider adding a confirmation pattern or rate limiting.
- Check for race conditions in the real-time subscription: if two users write simultaneously, confirm Firebase's last-write-wins behaviour is acceptable or if transactions should be used.

## 5. XSS & Injection

- Audit all dynamic string interpolation in JSX for potential XSS vectors. React's JSX escaping should handle most cases, but verify no bypass exists.
- Check that score keys constructed from user input (`date::person::actId`) cannot be crafted to traverse Firebase paths (e.g. names containing `/`, `.`, `$`, `[`, `]`, or `#` which are invalid in Firebase keys).
- Add Firebase key sanitisation: strip or reject any operative name containing characters invalid in Firebase RTDB paths.

## 6. Deployment & Network

- Verify Vercel deployment does not expose `.env` files or source maps in production.
- Check Vite config for `sourcemap` settings — disable in production builds.
- Confirm Firebase RTDB URL uses HTTPS only.
- Review `package.json` dependencies for known vulnerabilities — run the equivalent of `npm audit` and flag anything critical.

## Deliverables

For every issue found: explain the vulnerability, its severity (Critical / High / Medium / Low), and provide the exact code fix. Update all affected files. Add inline comments explaining security-sensitive decisions. Create a `SECURITY.md` file summarising what was audited, what was fixed, and any residual risks the developer should be aware of.
