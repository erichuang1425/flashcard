/**
 * Security-rules tests for `firestore.rules`, run against the Firestore
 * emulator. Untested rules are a real data-leak risk, so these verify the core
 * invariant — a user can only touch their own `/users/{uid}` subtree — plus the
 * read-only base vocabulary and the shared categories collection.
 *
 * Not part of `npm test`; run with `npm run test:rules` (boots the emulator).
 */
import { readFileSync } from 'fs';
import path from 'path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

const ALICE = 'alice';
const BOB = 'bob';

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-flashcard',
    firestore: {
      rules: readFileSync(path.resolve(__dirname, '../../../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

const aliceDb = () => testEnv.authenticatedContext(ALICE).firestore();
const bobDb = () => testEnv.authenticatedContext(BOB).firestore();
const anonDb = () => testEnv.unauthenticatedContext().firestore();

describe('users subtree', () => {
  it('lets an owner write and read their own document', async () => {
    const db = aliceDb();
    const ref = doc(db, 'users', ALICE, 'flashcards', 'c1');
    await assertSucceeds(setDoc(ref, { word: 'cat', isPublic: false }));
    await assertSucceeds(getDoc(ref));
  });

  it('blocks a different user from reading or writing the owner document', async () => {
    // Seed Alice's private card with rules disabled.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'flashcards', 'c1'), {
        word: 'cat',
        isPublic: false,
      });
    });

    const ref = doc(bobDb(), 'users', ALICE, 'flashcards', 'c1');
    await assertFails(getDoc(ref));
    await assertFails(setDoc(ref, { word: 'hacked' }));
  });

  it('blocks an unauthenticated user from the users subtree', async () => {
    const ref = doc(anonDb(), 'users', ALICE, 'stats', 'gamification');
    await assertFails(getDoc(ref));
    await assertFails(setDoc(ref, { totalXP: 999 }));
  });

  it('lets another user read a card explicitly marked public', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'flashcards', 'pub'), {
        word: 'shared',
        isPublic: true,
      });
    });

    // Public cards are readable by any signed-in user, but still not writable.
    const ref = doc(bobDb(), 'users', ALICE, 'flashcards', 'pub');
    await assertSucceeds(getDoc(ref));
    await assertFails(setDoc(ref, { word: 'tampered' }));
  });
});

describe('reading articles', () => {
  it('lets an owner read and write articles and the article counter', async () => {
    const db = aliceDb();
    const articleRef = doc(db, 'users', ALICE, 'articles', 'article-1');
    const counterRef = doc(db, 'users', ALICE, 'counters', 'articles');

    await assertSucceeds(setDoc(articleRef, { title: 'Article', content: 'Text' }));
    await assertSucceeds(getDoc(articleRef));
    await assertSucceeds(setDoc(counterRef, { count: 1 }));
    await assertSucceeds(getDoc(counterRef));
  });

  it('blocks another user from articles and the article counter', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'articles', 'article-1'), {
        title: 'Private article',
      });
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'counters', 'articles'), {
        count: 1,
      });
    });

    await assertFails(
      getDoc(doc(bobDb(), 'users', ALICE, 'articles', 'article-1'))
    );
    await assertFails(
      setDoc(doc(bobDb(), 'users', ALICE, 'articles', 'article-1'), {
        title: 'Tampered',
      })
    );
    await assertFails(
      getDoc(doc(bobDb(), 'users', ALICE, 'counters', 'articles'))
    );
  });

  it('blocks unauthenticated article and counter access', async () => {
    await assertFails(
      getDoc(doc(anonDb(), 'users', ALICE, 'articles', 'article-1'))
    );
    await assertFails(
      setDoc(doc(anonDb(), 'users', ALICE, 'counters', 'articles'), {
        count: 999,
      })
    );
  });
});

describe('base vocabulary', () => {
  it('is readable by any signed-in user but never writable from the client', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'vocabulary', 'word'), { word: 'cat' });
    });

    await assertSucceeds(getDoc(doc(aliceDb(), 'vocabulary', 'word')));
    await assertFails(setDoc(doc(aliceDb(), 'vocabulary', 'word'), { word: 'tampered' }));
  });

  it('is not readable when unauthenticated', async () => {
    await assertFails(getDoc(doc(anonDb(), 'vocabulary', 'word')));
  });
});

describe('categories', () => {
  it('allows creating a category you own', async () => {
    const ref = doc(aliceDb(), 'categories', 'cat-1');
    await assertSucceeds(setDoc(ref, { userId: ALICE, count: 0 }));
  });

  it('rejects creating a category owned by someone else', async () => {
    const ref = doc(aliceDb(), 'categories', 'cat-2');
    await assertFails(setDoc(ref, { userId: BOB, count: 0 }));
  });
});
