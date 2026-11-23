# ReflüRehber Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict Single-User Isolation (Zero Cross-User Access)**: Every health record (`/users/{userId}`, `/users/{userId}/logs/{logId}`, `/users/{userId}/assessments/{assessmentId}`) is readable, queryable, creatable, and deletable EXCLUSIVELY by the authenticated, email-verified user whose `request.auth.uid == userId`.
2. **Master Gate Parent Existence**: Subcollection records (`logs`, `assessments`) require the parent `/users/{userId}` document to exist with `userId == request.auth.uid`.
3. **Zero PII in Firestore**: Emails, phone numbers, and real names are never stored in Firestore documents; authentication identity remains exclusively inside Firebase Auth.
4. **Immutable Ownership & Timestamps**: `userId` and `createdAt` (server `request.time`) are immutable after creation. Historical `logs` and `assessments` are append-only + deletable (updates are denied to prevent retrospective tampering/update gaps).
5. **Bounded Sizes & Strict Keys**: Every string has an explicit `.size()` bound, every array has a `.size() <= MAX` bound + first-element type guard, every document ID passes `isValidId()`, and every `create`/`update` enforces `hasOnly(...)` to block shadow fields.

## 2. The "Dirty Dozen" Attack Payloads (All MUST Return PERMISSION_DENIED)
1. **Unauthenticated Read**: Anonymous/unauthenticated client calls `get(/users/alice/logs/log-1)`.
2. **Cross-User Read (IDOR)**: Signed-in user `bob` calls `get(/users/alice/logs/log-1)`.
3. **Cross-User List Scraping**: Signed-in user `bob` queries `list(/users/alice/logs)`.
4. **Identity Spoofing on Create**: Signed-in user `bob` writes to `/users/bob/logs/log-1` with `{ userId: "alice", ... }`.
5. **Unverified Email Bypass**: Signed-in user `alice` with `email_verified: false` attempts to write `/users/alice`.
6. **Shadow / Ghost Field Injection**: Signed-in `alice` creates `/users/alice` with extra field `isAdmin: true`.
7. **Client-Forged Timestamp**: Signed-in `alice` creates `/users/alice/logs/log-1` with a past client timestamp instead of `request.time`.
8. **ID Poisoning / Resource Exhaustion**: Signed-in `alice` writes a document ID containing invalid characters (`../other`) or > 128 chars.
9. **Oversized Raw Text Payload**: Signed-in `alice` creates a log with `rawText` of length 2500 (> 2000 limit).
10. **Unbounded Array Injection**: Signed-in `alice` creates a log with 20 items in `foods` (> 15 limit) or non-map element `[123]`.
11. **Value Poisoning on Settings Update**: Signed-in `alice` updates `/users/alice` setting `sleepShieldWindowHours: 99` (outside `[3, 4]`) or mutating immutable `createdAt`.
12. **Orphan Subcollection Write**: Signed-in `alice` creates `/users/alice/assessments/a1` when parent `/users/alice` does not exist.
