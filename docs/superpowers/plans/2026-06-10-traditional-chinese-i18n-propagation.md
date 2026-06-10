# Traditional Chinese i18n Propagation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route all first-party interface copy through the existing English and Traditional Chinese dictionaries.

**Architecture:** Extend the flat dictionaries in `src/i18n/translations.ts` and consume them through `useLanguage()` or `useI18n()`. Preserve user-authored/imported content and technical identifiers while translating labels, messages, accessibility text, and generated first-party titles.

**Tech Stack:** React 18, TypeScript, Material UI, Jest, Testing Library, Vite

---

### Task 1: Establish translation coverage

**Files:**
- Modify: `src/i18n/__tests__/translations.test.ts`
- Modify: `src/i18n/translations.ts`

- [ ] Add a failing test for representative keys from every uncovered area.
- [ ] Run the focused translation test and verify it fails for missing keys.
- [ ] Add matching English and Traditional Chinese entries with placeholder parity.
- [ ] Rerun the focused translation test and verify it passes.

### Task 2: Translate shared and study UI

**Files:**
- Modify shared loading, language, layout, timer, and progress components.
- Modify `src/pages/Study.tsx` and all study-mode components.
- Extend focused study-mode tests.

- [ ] Add failing Traditional Chinese rendering assertions.
- [ ] Replace first-party literals and accessibility labels with `t()`.
- [ ] Rerun focused component tests.

### Task 3: Translate import and worksheet flows

**Files:**
- Modify `src/pages/Import.tsx`, `src/components/ImportTools.tsx`,
  `src/components/WorksheetGenerator.tsx`, `src/pages/Worksheets.tsx`, and
  `src/pages/StudyWorksheet.tsx`.
- Extend `src/components/__tests__/ImportTools.test.ts`.

- [ ] Add failing translated import assertions.
- [ ] Replace import and worksheet literals while preserving data and format names.
- [ ] Rerun focused tests.

### Task 4: Translate diary, profile, settings, and gamification

**Files:**
- Modify diary, profile, settings, achievement, level, and gamification context surfaces.
- Extend the gamification context test.

- [ ] Add a failing translated level-up assertion.
- [ ] Replace remaining first-party literals.
- [ ] Rerun focused tests.

### Task 5: Verify the complete application

- [ ] Re-run the source literal audit and review every remaining hit.
- [ ] Run the full Jest suite, typecheck, build, and `git diff --check`.
- [ ] Verify representative English and Traditional Chinese flows in the browser.
