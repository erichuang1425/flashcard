# Traditional Chinese i18n Propagation

## Goal

Make all first-party interface copy switch between English and Traditional
Chinese through the existing language mode.

## Scope

- Add matching English and Traditional Chinese entries to
  `src/i18n/translations.ts`.
- Replace hard-coded labels, headings, helper text, status messages, errors,
  accessibility labels, and action text with the existing `t()` function.
- Cover pages, shared components, study modes, worksheet flows, import flows,
  diary, profile, progress, timers, and gamification surfaces.
- Preserve user-authored content, imported flashcard/article content, product
  names, filenames, and other technical identifiers.

## Architecture

Keep the existing flat dictionary and `LanguageProvider`. Components that do
not yet consume translations will use `useLanguage()` or the existing
`useI18n()` alias. Translation values with runtime data will use the existing
placeholder interpolation.

No new i18n package, locale routing, or persistence mechanism will be added.

## Verification

- Extend automated coverage to ensure English and Traditional Chinese remain
  in key and placeholder parity.
- Add checks for the newly translated component surfaces.
- Run the full Jest suite, TypeScript typecheck, and production build.
- Launch the app and verify representative English and Traditional Chinese
  flows in the browser, including console health and responsive rendering.
