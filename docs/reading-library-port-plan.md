# Plan: Restore the Article Reading Mode

## Status

Planning only. The vocabulary Library route is live, but the separate article
reading feature has not been restored. Implementation belongs in its own branch
and PR.

## Source and retained data

- Historical implementation: commit `e0eae7b` (old PR #28).
- Article documents: `users/{uid}/articles`.
- Counter document: `users/{uid}/counters/articles`.
- Cover images: `users/{uid}/articles/{id}/cover`.
- Existing Firestore data can be reused; no article migration is expected.

## Historical files to reconcile

| Area | Historical files |
| --- | --- |
| Page | `src/pages/Reading.tsx` |
| Context | `src/context/ReadingModeContext.tsx` |
| Services | `src/services/articleService.ts`, `src/services/ReadingAchievements.ts` |
| Types | `src/types/reading.ts` |
| Components | Files under `src/components/reading-mode/` |
| Skip | Empty `src/layouts/ReadingModeLayout.tsx` |

These files are source material, not copy-as-is candidates. They target a
different application architecture and import modules that no longer exist.

## Required compatibility work

The historical feature requires more than the original four bridges:

1. Map `useI18n` / `I18nContext` to the current `useLanguage` API.
2. Restore or replace `services/logging`.
3. Restore and test `utils/textSanitizer`.
4. Add the article/cache/import dependencies.
5. Restore or replace `components/common/Paper3D`.
6. Restore or replace `ErrorBoundary`.
7. Map historical `UserPreferencesContext` consumers to the current
   preferences API.
8. Restore or remove `UIStateContext` dependencies.
9. Restore or replace `useAudio` and `useFullscreen`.
10. Add `getFlashcardMetadata` and `FlashcardCounter` compatibility where
    dictionary-to-flashcard flows still require them.
11. Reconcile the old mobile controls with the current layout and mobile
    contexts.

Do not call a component ported while any of its imports are unresolved or
replaced by a no-op compatibility stub.

## Dependencies

Expected runtime dependencies:

- `localforage` for article/content caching.
- `jszip` for ZIP article import.
- `react-dropzone` for drag-and-drop import.
- `file-saver` is already present.

The historical implementation uses both `lodash/chunk` and `lodash/debounce`.
Prefer small local helpers or an existing debounce utility. Add lodash only if
the retained implementation still needs it. Audit imports before adding axios;
the historical dictionary component uses `fetch`.

## Support modules

### i18n shim

A temporary compatibility shim can reduce churn:

```ts
import { useLanguage } from './LanguageContext';

export const useI18n = () => {
  const { t, language, setLanguage } = useLanguage();
  return { t, language, setLanguage };
};
```

The shim must preserve every property actually consumed by retained reading
components.

### Shared UI and state adapters

Decide explicitly whether to port or replace:

- `Paper3D`
- `ErrorBoundary`
- user reading preferences
- fullscreen state
- focus-mode state
- reading sounds

Prefer current MUI and context patterns over reviving obsolete app-wide
providers solely for one feature.

## Firebase wiring

### Firestore rules

The current generic owner rule:

```text
match /users/{userId}/{document=**}
```

already covers article and counter subtrees. Add explicit rules only if that
generic rule is narrowed. Extend emulator tests to prove:

- owners can read/write their articles and article counter,
- other users cannot access them,
- unauthenticated clients cannot access them.

### Firestore indexes

Enumerate every retained `where` + `orderBy` query in `articleService` and add
only the required composite indexes. Likely combinations include category with
`createdAt` and progress/last-read ordering.

### Storage rules

Current Storage rules deny every operation. Add owner-only access for:

```text
users/{userId}/articles/{articleId}/cover
```

Add Storage emulator tests if the project adopts a Storage emulator harness.

## App integration

1. Mount `ReadingModeProvider` at the narrowest shared level needed.
2. Add a lazy protected `/reading` route.
3. Add a distinct Reading navigation item; do not reuse the vocabulary
   Library label or icon.
4. Add a Home action for `/reading`.
5. Add all retained reading keys to English and Traditional Chinese.

## Implementation stages

### Stage 1: Scope and foundations

- Decide which historical controls remain.
- Add dependencies and support modules.
- Implement shared UI/state adapters.
- Add type and sanitizer tests.
- Run `npm run typecheck`.

### Stage 2: Data services

- Port `types/reading.ts`.
- Port and reconcile `articleService`.
- Port `ReadingAchievements` only if retained.
- Add Firestore and cache tests.
- Add rules, indexes, and Storage rules.

### Stage 3: Reader state and UI

- Port `ReadingModeContext`.
- Port leaf components before composite reader components.
- Port `ReadingInterface` and `Reading`.
- Run typecheck and focused tests after each cluster.

### Stage 4: Integration and verification

- Add route, provider, navigation, Home action, and translations.
- Run:

```bash
npm run typecheck
npm test -- --runInBand
npm run test:rules
npm run build
```

- Smoke-test desktop and mobile widths:
  - existing article list,
  - open reader,
  - ZIP import,
  - dictionary to flashcard,
  - settings,
  - notes,
  - random article,
  - cover upload/delete.

## Known risks

- Historical `Article` types are duplicated between context and service code.
- Dictionary lookup depends on an external API and network policy.
- Cache keys and old article documents may contain legacy shapes.
- The historical code is large enough that blind bulk-copying is high risk.
- The article feature must not be confused with the current vocabulary Library.

## Deliverable

One separate, reviewable article-reading PR with tests and Firebase rule/index
changes. Do not combine it with vocabulary Library fixes or this remediation
PR.
