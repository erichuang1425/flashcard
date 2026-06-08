import { dvhMinHeight, dvhHeight, dvhMaxHeight } from '../viewport';

// These helpers exist so that engines without dynamic-viewport units (notably
// iOS Safari < 15.4) still get a usable `vh` value: a bare `dvh` declaration is
// dropped entirely on those engines, collapsing full-height shells. Each helper
// must emit a `vh` base and override it with the original `dvh` value behind an
// `@supports` guard.

describe('dvhMinHeight', () => {
  it('emits a vh base with a dvh override', () => {
    expect(dvhMinHeight()).toEqual({
      minHeight: '100vh',
      '@supports (min-height: 100dvh)': { minHeight: '100dvh' },
    });
  });

  it('converts every dvh occurrence in the base while keeping the override exact', () => {
    expect(dvhMinHeight('80dvh')).toEqual({
      minHeight: '80vh',
      '@supports (min-height: 100dvh)': { minHeight: '80dvh' },
    });
  });

  it('rewrites dvh inside calc() expressions for the fallback', () => {
    expect(dvhMinHeight('calc(100dvh - 56px)')).toEqual({
      minHeight: 'calc(100vh - 56px)',
      '@supports (min-height: 100dvh)': { minHeight: 'calc(100dvh - 56px)' },
    });
  });
});

describe('dvhHeight', () => {
  it('emits a vh base with a dvh override', () => {
    expect(dvhHeight('calc(100dvh - 88px)')).toEqual({
      height: 'calc(100vh - 88px)',
      '@supports (height: 100dvh)': { height: 'calc(100dvh - 88px)' },
    });
  });
});

describe('dvhMaxHeight', () => {
  it('emits a vh base with a dvh override', () => {
    expect(dvhMaxHeight('85dvh')).toEqual({
      maxHeight: '85vh',
      '@supports (max-height: 100dvh)': { maxHeight: '85dvh' },
    });
  });
});
