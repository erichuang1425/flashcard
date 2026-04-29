# Contributing Guide

Thanks for your interest in improving Flashcard Studio.

## Workflow

1. Create a feature branch from `main`.
2. Make focused, well-scoped changes.
3. Run all required checks locally.
4. Open a pull request with a clear summary and testing notes.

## Local development

```bash
npm install
npm run dev
```

## Required checks

Run these before opening a pull request:

```bash
npm run test
npm run build
```

## Coding standards

- Use TypeScript-first patterns.
- Keep components small and composable.
- Prefer pure utilities in `src/utils` for reusable logic.
- Add tests for behavior changes in utilities and critical component logic.
- Avoid unrelated formatting-only changes in feature PRs.

## Pull request quality checklist

- [ ] Scope is clear and intentional.
- [ ] Build passes locally.
- [ ] Tests pass locally.
- [ ] Documentation is updated when behavior changes.
- [ ] No secrets or environment files are committed.
