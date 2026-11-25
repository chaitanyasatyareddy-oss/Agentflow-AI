/**
 * Dirty Dozen security rule payload definitions verifying PERMISSION_DENIED invariants.
 * Evaluated against firestore.rules and security_spec.md.
 */
export const DIRTY_DOZEN_CASES = [
  { id: 1, operation: 'get', path: '/users/u1', auth: null, expected: 'PERMISSION_DENIED' },
  { id: 2, operation: 'list', path: '/users', auth: null, expected: 'PERMISSION_DENIED' },
  { id: 3, operation: 'create', path: '/users/u1', auth: { uid: 'u1', email_verified: false }, expected: 'PERMISSION_DENIED' },
  { id: 4, operation: 'create', path: '/users/u2', auth: { uid: 'u1', email_verified: true }, expected: 'PERMISSION_DENIED' },
  { id: 5, operation: 'create', path: '/users/u1', payload: { uid: 'u2' }, auth: { uid: 'u1', email_verified: true }, expected: 'PERMISSION_DENIED' },
  { id: 6, operation: 'create', path: '/users/u1', payload: { uid: 'u1', role: 'admin' }, auth: { uid: 'u1', email_verified: true }, expected: 'PERMISSION_DENIED' },
  { id: 7, operation: 'create', path: '/users/u1', payload: { uid: 'u1', role: 'user', isVerified: true }, auth: { uid: 'u1', email_verified: true }, expected: 'PERMISSION_DENIED' },
  { id: 8, operation: 'create', path: '/users/u1', payload: { uid: 'u1', role: 'user', createdAt: 'client-time' }, auth: { uid: 'u1', email_verified: true }, expected: 'PERMISSION_DENIED' },
  { id: 9, operation: 'update', path: '/users/u1', payload: { role: 'admin' }, auth: { uid: 'u1', email_verified: true }, expected: 'PERMISSION_DENIED' },
  { id: 10, operation: 'update', path: '/users/u1', payload: { createdAt: 'mutated' }, auth: { uid: 'u1', email_verified: true }, expected: 'PERMISSION_DENIED' },
  { id: 11, operation: 'get', path: '/users/u2/private/info', auth: { uid: 'u1', email_verified: true }, expected: 'PERMISSION_DENIED' },
  { id: 12, operation: 'create', path: '/users/u1/private/other', auth: { uid: 'u1', email_verified: true }, expected: 'PERMISSION_DENIED' },
] as const;
