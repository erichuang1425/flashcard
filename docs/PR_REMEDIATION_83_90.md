# PR #83-#90 Remediation Ledger

Date: June 9, 2026

## Purpose

This ledger records the audit of merged PRs #83 through #90, the remediation
stages applied afterward, and work that remains intentionally separate. A
merged PR is not treated as complete solely because its branch merged or its
default tests passed.

## Stage 1: Authentication integrity

Related PR: #90

Completed in this remediation:

- Preserve a Google credential returned from
  `auth/account-exists-with-different-credential` across redirect reloads.
- Scope the persisted credential to `sessionStorage`, not durable local
  storage.
- Expose the pending email to Login and Register so the password-link prompt
  appears after a mobile redirect return.
- Clear pending state only after `linkWithCredential` succeeds or the user
  signs out.
- Propagate linking failures instead of reporting a successful sign-in.
- Require the password email to match the email attached to the pending Google
  credential, and reject incomplete conflict payloads without retaining them.

Regression evidence:

- Redirect conflict survives provider remount and links on password sign-in.
- Failed linking remains pending and rejects to the caller.
- A pending credential cannot be attached to a different email account.

## Stage 2: Study and Library behavior

Related PRs: #83, #85, #86

Completed in this remediation:

- Treat "no cards due" as the successful `All caught up!` state instead of an
  error branch.
- Query Library categories with the signed-in user's UID.
- Prevent Enter/Space events from nested pronunciation or rating controls from
  triggering the parent FlashCard flip shortcut.

Regression evidence:

- Pure Study load-state test for zero due cards.
- Library rendering test asserting user-scoped category loading.
- FlashCard keyboard test asserting nested controls do not flip the card.

## Stage 3: Documentation accuracy

Related PRs: #87, #88, #89

Completed in this remediation:

- Replaced the stale coverage baseline with a completed/remaining ledger.
- Documented that Jest's current coverage percentage excludes unimported files
  and is not repository-wide coverage.
- Kept Firestore emulator coverage separate from the default suite and recorded
  its Java prerequisite.
- Expanded the reading-library restoration plan to include all missing
  historical imports and state adapters.
- Corrected the Firestore rules plan: the current generic owner rule already
  covers article and counter subtrees; emulator proof is still required.

## Per-PR status after remediation

| PR | Status | Notes |
| --- | --- | --- |
| #83 | Remediated | The unreachable empty state is fixed. |
| #84 | Complete for vocabulary Library navigation | This did not restore the separate article-reading feature. |
| #85 | Remediated | Nested keyboard controls no longer trigger card flip shortcuts. |
| #86 | Remediated | Personal words and personal categories are both user-scoped. |
| #87 | Complete for its declared first test tranche | It explicitly left writer coverage for the next PR. |
| #88 | Corrected | Targeted plan items landed, but repository-wide coverage work remains. |
| #89 | Corrected plan only | Reading-mode implementation remains a separate feature PR. |
| #90 | Remediated | Popup and redirect account-linking paths share pending state. |

## Deferred work

- Run `npm run test:rules` in an environment with Java available.
- Implement article reading in its own branch and PR.
- Continue the coverage stages in `docs/TEST_COVERAGE_ANALYSIS.md`.
- Add real-device mobile authentication smoke testing for Firebase redirect
  configuration and authorized domains.

## Required verification

Before merging this remediation PR:

```bash
npm run typecheck
npm test -- --runInBand
npm run build
```

When Java is available:

```bash
npm run test:rules
```
