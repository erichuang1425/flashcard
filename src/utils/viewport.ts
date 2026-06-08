// Dynamic-viewport-height (`dvh`) helpers.
//
// `dvh` accounts for the mobile address bar showing/hiding, but it is
// unsupported on older engines (notably iOS Safari < 15.4). On those engines a
// bare `height: 100dvh` declaration is dropped entirely, leaving full-height
// shells with no height and collapsing them. These helpers emit a `vh` base
// first, then override with the `dvh` value only where it's supported.

type CSSObject = Record<string, unknown>;

/** `minHeight` with a `vh` fallback for engines lacking `dvh`. */
export const dvhMinHeight = (expr = '100dvh'): CSSObject => ({
  minHeight: expr.replace(/dvh/g, 'vh'),
  '@supports (min-height: 100dvh)': { minHeight: expr },
});

/** `height` with a `vh` fallback for engines lacking `dvh`. */
export const dvhHeight = (expr = '100dvh'): CSSObject => ({
  height: expr.replace(/dvh/g, 'vh'),
  '@supports (height: 100dvh)': { height: expr },
});
