# CleanSight — Authentication Security Audit

**Date:** February 11, 2026  
**Scope:** Firebase Auth + Backend /api/auth/register  
**Status:** 1 security bug found

---

## TASK 1 — Verify Firebase Providers

### Where to check

1. Open https://console.firebase.google.com
2. Select the CleanSight project
3. Go to Build > Authentication > Sign-in method tab
4. Confirm these are enabled:
   - Email/Password — must show Enabled
   - Google — must show Enabled with a support email set

If either is disabled, click it, toggle Enable, and save.

---

## TASK 2 — /api/auth/register Security Analysis

**File:** Backend/src/routes/auth.js

| Question | Answer |
|----------|--------|
| Does backend get firebaseUid only from verified token? | YES — from req.user set by verifyToken middleware |
| Does it ever trust firebaseUid from request body? | NO — body only provides name, email, role |
| Does it accept role from frontend? | YES — role comes from req.body |
| If user already exists, does it ignore role? | YES — returns existing user without modification |
| If user already exists, does it overwrite role? | NO |
| Can a user call this endpoint again to escalate role? | NO — existing user check returns early |
| Is there any code path that allows role change? | NO — PUT /profile only updates name, phone, avatar |

### Finding

On first registration only, the backend accepts any role value from the client including staff and admin. This is a security bug.

---

## TASK 3 — First Registration Logic

| Check | Result |
|-------|--------|
| Role accepted only if user does not exist | YES |
| If user exists, role is not modified | YES |
| Role cannot change via /register after first creation | YES |

### Security Bug

Line 48 in Backend/src/routes/auth.js:

```
role: role || 'citizen'
```

This accepts any value from the Mongoose enum on first registration. A malicious user with a valid Firebase token can send role: "admin" and get an admin account.

### Fix

Replace this line:

```
role: role || 'citizen'
```

With this line:

```
role: (role === 'citizen' || role === 'volunteer') ? role : 'citizen'
```

This allows only citizen and volunteer to be self-assigned. Staff and admin must be set through a separate admin process.

---

## TASK 4 — Google First, Email Second Case

**Scenario:** User signs up with Google, then tries Email/Password signup with the same email.

| Question | Answer |
|----------|--------|
| What happens in Firebase? | Throws auth/email-already-in-use error |
| Does it create a duplicate Firebase account? | NO |
| Does it throw a provider error? | YES — email-already-in-use |
| Does backend duplicate MongoDB user? | NO — Firebase error stops the flow before API call |
| Is there risk of duplicate user documents? | NO |

**Why it is safe:**

1. Firebase blocks duplicate email accounts by default
2. Backend checks firebaseUid existence before creating
3. MongoDB has unique indexes on both firebaseUid and email

---

## TASK 5 — Role Escalation Test

**Attack:** Authenticated citizen sends POST /api/auth/register with body { "role": "admin" }

| Scenario | Result |
|----------|--------|
| User already exists in MongoDB | SAFE — returns existing user, ignores role in body |
| User does not exist yet (first registration) | UNSAFE — creates user with admin role |

The attack window exists between Firebase account creation and the first /register call. An attacker calling the API directly with a valid token and no existing MongoDB document can exploit this.

---

## TASK 6 — Final Verdict

| Category | Status |
|----------|--------|
| Firebase Providers | OK — verify manually in Console |
| UID Handling | SAFE — always from verified token |
| Role Creation Logic | UNSAFE — accepts staff/admin on first creation |
| Role Escalation Risk | YES — on first registration only |
| Duplicate Account Risk | NO |

---

## Required Fix

**File:** Backend/src/routes/auth.js  
**Line:** 48  

**Current code:**

```javascript
const user = await User.create({
  firebaseUid,
  name,
  email,
  role: role || 'citizen'
});
```

**Fixed code:**

```javascript
const user = await User.create({
  firebaseUid,
  name,
  email,
  role: (role === 'citizen' || role === 'volunteer') ? role : 'citizen'
});
```

This is the only change needed. Do not refactor anything else.

---

**AUTH SECURITY AUDIT COMPLETE**
