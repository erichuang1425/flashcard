/**
 * Unit tests for the user-profile service. Firestore and the firebase service
 * module are mocked so we verify the read-then-write logic: a first sign-in
 * creates the doc (stamping `createdAt`), while a return visit merges fresh
 * fields without touching `createdAt`.
 */
const mockDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  serverTimestamp: () => '__ts__',
}));

jest.mock('../firebase', () => ({ db: { __db: true } }));

import { ensureUserProfile } from '../user';

type AnyUser = Parameters<typeof ensureUserProfile>[0];
const fbUser = (overrides: Record<string, unknown> = {}): AnyUser =>
  ({
    uid: 'u1',
    email: 'a@b.com',
    displayName: 'Mina',
    photoURL: null,
    providerData: [{ providerId: 'password' }],
    ...overrides,
  }) as unknown as AnyUser;

beforeEach(() => {
  jest.clearAllMocks();
  mockDoc.mockReturnValue({ __ref: 'users/u1/profile/info' });
  mockSetDoc.mockResolvedValue(undefined);
});

describe('ensureUserProfile', () => {
  it('targets the user-scoped profile doc', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    await ensureUserProfile(fbUser());
    expect(mockDoc).toHaveBeenCalledWith({ __db: true }, 'users', 'u1', 'profile', 'info');
  });

  it('creates a profile and stamps createdAt on first sign-in', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    await ensureUserProfile(fbUser());

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, data, options] = mockSetDoc.mock.calls[0];
    expect(data).toMatchObject({
      uid: 'u1',
      email: 'a@b.com',
      displayName: 'Mina',
      photoURL: null,
      providers: ['password'],
      createdAt: '__ts__',
      lastLoginAt: '__ts__',
    });
    // A create (not a merge) so the document is fully written.
    expect(options).toBeUndefined();
  });

  it('merges fresh fields without overwriting createdAt on return', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true });
    await ensureUserProfile(fbUser({ providerData: [{ providerId: 'google.com' }] }));

    const [, data, options] = mockSetDoc.mock.calls[0];
    expect(data).not.toHaveProperty('createdAt');
    expect(data).toMatchObject({ providers: ['google.com'], lastLoginAt: '__ts__' });
    expect(options).toEqual({ merge: true });
  });
});
