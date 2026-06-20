// Barrel module. The former 1100-line `firestore.ts` was split into focused
// domain modules (Phase 3 of docs/core-features-redesign-plan.md). It is kept
// as a re-export surface so existing call sites can migrate to the specific
// modules incrementally without a flag-day rename.
//
//   - ./cards       — flashcard CRUD, review writes, due/count queries, search
//   - ./stats       — study stats, streaks, dashboard aggregation
//   - ./categories  — user-scoped categories + legacy global merge-read
//   - ./worksheets  — worksheet documents
//   - ./diary       — diary entries
//
// Prefer importing from the domain module directly in new code.
export * from './cards';
export * from './stats';
export * from './categories';
export * from './worksheets';
export * from './diary';
