# Security Specification — AgentFlow AI Firestore Rules

## 1. Data Invariants
1. A `/users/{userId}` document may only be created or read by the verified user matching `userId` (`request.auth.uid == userId`) or a verified Admin.
2. Self-assigned privilege escalation is impossible: a non-admin user creating `/users/{userId}` may only set `role == "user"`, and may never alter `role` on update.
3. PII (`email`) is strictly isolated in `/users/{userId}/private/info` and is readable/writable only by the verified owner or an Admin.
4. `uid`, `createdAt` remain immutable after creation, and all `createdAt` / `updatedAt` timestamps must match `request.time`.
5. Path IDs (`userId`, `docId`) must match `^[a-zA-Z0-9_-]+$` and stay within `<= 128` characters.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated `get` on `/users/u1`.
2. Unauthenticated `list` on `/users`.
3. Signed-in user `u1` with `email_verified: false` creating `/users/u1`.
4. Signed-in user `u1` creating `/users/u2` (cross-user write / identity spoofing).
5. Signed-in user `u1` creating `/users/u1` with `"uid": "u2"` inside payload.
6. Signed-in user `u1` creating `/users/u1` with `"role": "admin"` (privilege escalation).
7. Signed-in user `u1` creating `/users/u1` with shadow field `"isVerified": true`.
8. Signed-in user `u1` creating `/users/u1` with client-forged `createdAt` != `request.time`.
9. Signed-in user `u1` updating `/users/u1` to change `"role": "admin"`.
10. Signed-in user `u1` updating `/users/u1` to mutate immutable `"createdAt"`.
11. Signed-in user `u1` reading `/users/u2/private/info` (PII leak attempt).
12. Signed-in user `u1` writing `/users/u1/private/other` (invalid private doc ID) or `/admins/u1`.
