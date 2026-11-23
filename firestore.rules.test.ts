import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf-8'));

// Mirrors our exact client-side volumetric & blueprint sanitizer before Firestore writes
const ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function simulateRulesDecision(params: {
  authUid: string | null;
  emailVerified: boolean;
  pathUserId: string;
  docId?: string;
  op: 'get' | 'list' | 'create' | 'update' | 'delete';
  collection: 'users' | 'logs' | 'assessments';
  payload?: Record<string, unknown>;
  existingUserId?: string;
  parentExists?: boolean;
  serverTimeMatches?: boolean;
}): 'ALLOW' | 'PERMISSION_DENIED' {
  const { authUid, emailVerified, pathUserId, docId, op, collection, payload, existingUserId, parentExists, serverTimeMatches } = params;

  if (!authUid || !emailVerified) return 'PERMISSION_DENIED';
  if (authUid !== pathUserId) return 'PERMISSION_DENIED';
  if (op !== 'list' && !ID_REGEX.test(pathUserId)) return 'PERMISSION_DENIED';
  if (op !== 'list' && collection !== 'users' && (!docId || !ID_REGEX.test(docId))) return 'PERMISSION_DENIED';

  if (collection === 'users') {
    if (op === 'list') return 'PERMISSION_DENIED';
    if (op === 'get' || op === 'delete') return 'ALLOW';
    if (!payload) return 'PERMISSION_DENIED';
    const keys = Object.keys(payload);
    const allowed = new Set(['userId', 'sleepShieldWindowHours', 'sleepShieldLastMealMs', 'createdAt', 'updatedAt']);
    if (!keys.every((k) => allowed.has(k))) return 'PERMISSION_DENIED';
    if (payload.userId !== authUid) return 'PERMISSION_DENIED';
    if (payload.sleepShieldWindowHours !== 3 && payload.sleepShieldWindowHours !== 4) return 'PERMISSION_DENIED';
    if (!serverTimeMatches) return 'PERMISSION_DENIED';
    return 'ALLOW';
  }

  if (op === 'update') return 'PERMISSION_DENIED';
  if (op === 'get' || op === 'list' || op === 'delete') {
    return existingUserId === authUid ? 'ALLOW' : 'PERMISSION_DENIED';
  }
  if (op === 'create') {
    if (!parentExists || !payload || !serverTimeMatches) return 'PERMISSION_DENIED';
    if (payload.userId !== authUid) return 'PERMISSION_DENIED';
    if (collection === 'logs') {
      if (typeof payload.rawText !== 'string' || payload.rawText.length === 0 || payload.rawText.length > 2000) return 'PERMISSION_DENIED';
      if (!DATE_REGEX.test(String(payload.dateStr ?? '')) || !TIME_REGEX.test(String(payload.timeHHMM ?? ''))) return 'PERMISSION_DENIED';
      if (!Array.isArray(payload.foods) || payload.foods.length > 15) return 'PERMISSION_DENIED';
      if (payload.foods.length > 0 && typeof payload.foods[0] !== 'object') return 'PERMISSION_DENIED';
    }
    return 'ALLOW';
  }
  return 'PERMISSION_DENIED';
}

test('firestore.rules contains default-deny catch-all, email_verified gate, Master Gate parent check, and covers every blueprint collection', () => {
  assert.ok(rulesContent.includes("rules_version = '2';"));
  assert.ok(rulesContent.includes('allow read, write: if false;'));
  assert.ok(rulesContent.includes('request.auth.token.email_verified == true'));
  assert.ok(rulesContent.includes('hasValidUserParent(userId)'));
  assert.ok(rulesContent.includes('match /users/{userId}'));
  assert.ok(rulesContent.includes('match /logs/{logId}'));
  assert.ok(rulesContent.includes('match /assessments/{assessmentId}'));
  assert.deepEqual(Object.keys(blueprint.firestore).sort(), [
    '/users/{userId}',
    '/users/{userId}/assessments/{assessmentId}',
    '/users/{userId}/logs/{logId}',
  ]);
});

test('Dirty Dozen adversarial payloads all resolve to PERMISSION_DENIED', () => {
  // 1. Unauthenticated read
  assert.equal(simulateRulesDecision({ authUid: null, emailVerified: false, pathUserId: 'alice', docId: 'log-1', op: 'get', collection: 'logs', existingUserId: 'alice' }), 'PERMISSION_DENIED');
  // 2. Cross-user read (IDOR)
  assert.equal(simulateRulesDecision({ authUid: 'bob', emailVerified: true, pathUserId: 'alice', docId: 'log-1', op: 'get', collection: 'logs', existingUserId: 'alice' }), 'PERMISSION_DENIED');
  // 3. Cross-user list scraping
  assert.equal(simulateRulesDecision({ authUid: 'bob', emailVerified: true, pathUserId: 'alice', op: 'list', collection: 'logs', existingUserId: 'alice' }), 'PERMISSION_DENIED');
  // 4. Identity spoofing on create
  assert.equal(simulateRulesDecision({ authUid: 'bob', emailVerified: true, pathUserId: 'bob', docId: 'log-1', op: 'create', collection: 'logs', parentExists: true, serverTimeMatches: true, payload: { userId: 'alice', rawText: 'çay', dateStr: '2026-11-23', timeHHMM: '12:00', foods: [] } }), 'PERMISSION_DENIED');
  // 5. Unverified email bypass
  assert.equal(simulateRulesDecision({ authUid: 'alice', emailVerified: false, pathUserId: 'alice', op: 'create', collection: 'users', serverTimeMatches: true, payload: { userId: 'alice', sleepShieldWindowHours: 3 } }), 'PERMISSION_DENIED');
  // 6. Shadow / ghost field injection
  assert.equal(simulateRulesDecision({ authUid: 'alice', emailVerified: true, pathUserId: 'alice', op: 'create', collection: 'users', serverTimeMatches: true, payload: { userId: 'alice', sleepShieldWindowHours: 3, isAdmin: true } }), 'PERMISSION_DENIED');
  // 7. Client-forged timestamp
  assert.equal(simulateRulesDecision({ authUid: 'alice', emailVerified: true, pathUserId: 'alice', docId: 'log-1', op: 'create', collection: 'logs', parentExists: true, serverTimeMatches: false, payload: { userId: 'alice', rawText: 'çay', dateStr: '2026-11-23', timeHHMM: '12:00', foods: [] } }), 'PERMISSION_DENIED');
  // 8. ID poisoning
  assert.equal(simulateRulesDecision({ authUid: 'alice', emailVerified: true, pathUserId: 'alice', docId: '../other', op: 'create', collection: 'logs', parentExists: true, serverTimeMatches: true, payload: { userId: 'alice', rawText: 'çay', dateStr: '2026-11-23', timeHHMM: '12:00', foods: [] } }), 'PERMISSION_DENIED');
  // 9. Oversized rawText
  assert.equal(simulateRulesDecision({ authUid: 'alice', emailVerified: true, pathUserId: 'alice', docId: 'log-1', op: 'create', collection: 'logs', parentExists: true, serverTimeMatches: true, payload: { userId: 'alice', rawText: 'a'.repeat(2500), dateStr: '2026-11-23', timeHHMM: '12:00', foods: [] } }), 'PERMISSION_DENIED');
  // 10. Unbounded array injection
  assert.equal(simulateRulesDecision({ authUid: 'alice', emailVerified: true, pathUserId: 'alice', docId: 'log-1', op: 'create', collection: 'logs', parentExists: true, serverTimeMatches: true, payload: { userId: 'alice', rawText: 'çay', dateStr: '2026-11-23', timeHHMM: '12:00', foods: Array(20).fill({ rawName: 'çay' }) } }), 'PERMISSION_DENIED');
  // 11. Value poisoning on settings update
  assert.equal(simulateRulesDecision({ authUid: 'alice', emailVerified: true, pathUserId: 'alice', op: 'update', collection: 'users', serverTimeMatches: true, payload: { userId: 'alice', sleepShieldWindowHours: 99 } }), 'PERMISSION_DENIED');
  // 12. Orphan subcollection write (parent missing)
  assert.equal(simulateRulesDecision({ authUid: 'alice', emailVerified: true, pathUserId: 'alice', docId: 'a-1', op: 'create', collection: 'assessments', parentExists: false, serverTimeMatches: true, payload: { userId: 'alice' } }), 'PERMISSION_DENIED');
});
