# Plan: Restore the full reading-mode (articles) feature

## Background / findings

- The "reading library of articles" feature was dropped during the big
  "professional refactor", but **the article data still lives in Firestore** at
  `users/{uid}/articles` (with a counter doc at `users/{uid}/counters/articles`
  and cover images in Storage under `users/{uid}/articles/{id}/cover`).
  Restoring the UI + service surfaces the existing articles again — no data
  migration is required.
- Source of truth for the old implementation: commit **`e0eae7b`** (head of the
  old PR #28). It spans 20 files, ~5,500 lines.
- It targets an **older codebase shape** that differs from today's in four ways
  we must bridge:
  1. i18n: `useI18n` / `I18nContext` → current `useLanguage` / `LanguageContext`
  2. a `services/logging` module (no longer present)
  3. a `utils/textSanitizer` module (no longer present)
  4. extra npm dependencies (`localforage`, `jszip`, `react-dropzone`, …)

## Files to port (verbatim or lightly adapted) from `e0eae7b`

| Area | Files |
|---|---|
| Page | `src/pages/Reading.tsx` (387) |
| Context | `src/context/ReadingModeContext.tsx` (236) |
| Service | `src/services/articleService.ts` (1074), `src/services/ReadingAchievements.ts` (66) |
| Types | `src/types/reading.ts` (74) |
| Components (`src/components/reading-mode/`) | `ReadingInterface` (1055), `ArticleList` (331), `ArticleImporter` (281), `DictionaryLookup` (464), `MobileDictionaryLookup` (332), `NoteSystem` (192), `ReadingNavigation` (263), `ManageArticlesTab` (200), `ReadingActionMenu` (178), `ReadingSettingsDialog` (114), `ReadingAchievementPopup` (109), `ReadingSpeedTracker` (65), `RandomArticleButton` (63), `MobileContextMenu` (64) |
| Skip | `src/layouts/ReadingModeLayout.tsx` (empty, 0 lines) |

## New support modules to create in the current tree

1. **`src/services/logging.ts`** — port as-is. Exports `logger`, `ArticleError`,
   `CacheError`, `LogLevel`, `LogEntry`. (~70 lines, no external deps.)
2. **`src/utils/textSanitizer.ts`** — port as-is. Exports `sanitizeText`,
   `isValidText`.
3. **`src/i18n/I18nContext.tsx`** — thin **compatibility shim** so we don't have
   to edit ~14 component imports:
   ```ts
   import { useLanguage } from './LanguageContext';
   export const useI18n = () => {
     const { t, language, setLanguage } = useLanguage();
     return { t, language, setLanguage };
   };
   ```
   This works because the ported components only consume `{ t }` (and
   occasionally `language`). Old `t('reading.x.y')` calls map to flat dotted
   keys, which is exactly how the current `t` resolves them.

## Dependencies to add (`package.json`)

- `localforage` `^1.10.0` (+ `@types/localforage`) — offline article/content
  cache used throughout `articleService`.
- `jszip` `^3.10.1` (+ `@types/jszip`) — ZIP article import (dynamic
  `import('jszip')` in `ArticleImporter`). **This is the most likely original
  ingestion path for the "tonnes of articles"** — a ZIP of article files.
- `react-dropzone` — the importer's drag-and-drop zone.
- `lodash`'s `chunk` is the only lodash use → **replace with a 3-line local
  `chunk` helper** to avoid pulling in all of lodash (recommended), or add
  `lodash` + `@types/lodash`.
- `axios` appears in the old deps, but `DictionaryLookup` uses `fetch` →
  **audit and skip axios** unless a ported file actually imports it.
- `file-saver` is already present.

## Firestore / Storage wiring (required, or queries silently fail)

4. **`firestore.rules`** — add owner-only access for the new subtree:
   ```
   match /users/{userId}/articles/{articleId} {
     allow read, write: if request.auth.uid == userId;
   }
   match /users/{userId}/counters/{counterId} {
     allow read, write: if request.auth.uid == userId;
   }
   ```
5. **`firestore.indexes.json`** — `articleService` filters by `category` and
   orders by `createdAt` / `lastRead` / progress, plus random sampling. Add the
   composite indexes those queries need (e.g. `category ASC, createdAt DESC`).
   Enumerate the exact set by grepping every `query(... where ... orderBy ...)`
   in `articleService` during implementation.
6. **`storage.rules`** — allow `users/{userId}/articles/{id}/cover` read/write
   for the owner (cover-image upload/delete).

## App integration

7. **Provider**: mount `ReadingModeProvider` in `App.tsx` (inside
   `GamificationProvider` / `FocusModeProvider`) so `useReadingMode` resolves.
8. **Route**: add a lazy route in `App.tsx`:
   ```tsx
   const Reading = lazy(() => import('./pages/Reading').then(m => ({ default: m.Reading })));
   <Route path="/reading" element={<ProtectedRoute><Reading /></ProtectedRoute>} />
   ```
9. **Nav bar** (`NavBar.tsx`): add a `Reading` item to `menuItems` (drawer on
   mobile + top bar on desktop). Library currently uses `MenuBookIcon`; give
   Reading a distinct icon (`AutoStoriesIcon`) and switch Library back to
   `LibraryBooksIcon` / `StyleIcon` so the two are not identical.
10. **Home "Start reading" button** (`Home.tsx`): add a third action button next
    to "Start Review" / "Add Cards" that calls `navigate('/reading')`, using a
    reading icon.

## i18n keys (add to `src/i18n/translations.ts`, both `en` and `zh`)

Add ~50 flat dotted keys the reading components reference, e.g. `nav.reading`,
`reading.tabs.{library,import,manage}`, `reading.library.{empty,search,sortBy.*}`,
`reading.import.dropzone.*`, `reading.import.error.*`, `reading.manage.*`,
`reading.settings.*`, `reading.tools.*`, `reading.actions.random`,
`reading.dictionary.addToFlashcards`. (Full list already extracted from the
source — ~50 keys × 2 languages.) Reuse existing `common.cancel` / `common.save`
if present, else add them.

## `firestore.ts` gaps to fill

`DictionaryLookup` imports `getFlashcardMetadata` and the `FlashcardCounter`
type, and calls `addFlashcard` / `addCategory` / `getUserFlashcards` (the latter
three exist today). Port `getFlashcardMetadata` + `FlashcardCounter` from the old
`firestore.ts` / `types`, or stub `getFlashcardMetadata` if it is only an
optimization. Confirm the old `addFlashcard` call shape still compiles against
today's `Flashcard` type (today's `addFlashcard` injects the SM-2 fields, so the
call site should be fine).

## Known reconciliation risks (resolve during the port, guided by `tsc`)

- **Duplicate `Article` type**: `ReadingModeContext` defines its own `Article`;
  `articleService` / `Reading.tsx` use `types/reading`. They were structurally
  compatible before; unify by having the context re-export from `types/reading`
  if `tsc` complains.
- **External calls**: `DictionaryLookup` hits `https://api.dictionaryapi.dev` —
  works only when the environment's network policy allows outbound traffic.
  Note this in the PR.
- **MobileContext**: `MobileDictionaryLookup` / `MobileContextMenu` assume a
  mobile context; verify against the current `MobileContext` / `useMediaQuery`
  usage.
- **Caching keys**: `localforage` cache keys are namespaced in the service; no
  migration needed.

## Vocabulary library "not working on mobile" (separate, already addressed)

- The empty-library cause was the `isPublic` filter — **fixed in PR #86**
  (`getVocabularyWords` / `searchVocabulary`). The vocab Library now populates on
  mobile and desktop.
- As part of this work, do one mobile pass on `Library.tsx` / `WordGrid.tsx`:
  confirm the `react-intersection-observer` "load more" sentinel fires with <3
  items, that cards render full-width at `xs`, and optionally surface the
  `chineseTranslation` on each card (currently omitted). If a concrete mobile
  rendering bug remains beyond the data fix, capture the exact repro and fix it.

## Execution order (incremental, each step compiles)

1. Branch `feat/reading-library-port` off `main`.
2. Add deps + `logging.ts` + `textSanitizer.ts` + `I18nContext` shim +
   `types/reading.ts`.
3. Port `articleService.ts` + `ReadingAchievements.ts`; run `tsc` until clean.
4. Port `ReadingModeContext`; mount the provider.
5. Port leaf components → `ReadingInterface` → `Reading.tsx`; run `tsc` after
   each cluster.
6. Add i18n keys, route, nav item, Home button.
7. Add Firestore rules / indexes + Storage rules.
8. `tsc --noEmit`, `jest`, `npm run build`.
9. Manual smoke test: `/reading` lists existing Firestore articles, open reader,
   ZIP import, dictionary → flashcard, settings, random article — on both desktop
   and mobile widths.
10. Open a **separate PR** (independent of the merged PR #86).

## Deliverable size estimate

~20 new files + 3 support modules + 2–3 new deps + rules/indexes + 4 integration
edits (`App`, `NavBar`, `Home`, `translations`). Expect meaningful `tsc`
reconciliation given the codebase drift; realistically a few iterations to green.
