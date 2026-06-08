// `position: fixed` elements are laid out against the viewport (the initial
// containing block), NOT the safe-area-padded `<body>` set up in index.html —
// so the body padding does nothing for them and they draw edge-to-edge into
// the notch / home-indicator regions when `viewport-fit=cover` is set. Fixed
// chrome (AppBar, FABs, the desktop side panel, full-screen shells) must opt
// into the insets itself.
//
// `env(safe-area-inset-*, 0px)` resolves to 0 on devices without a physical
// inset, so these are inert on non-notched screens and desktop.
export const SAFE_AREA = {
  top: 'env(safe-area-inset-top, 0px)',
  bottom: 'env(safe-area-inset-bottom, 0px)',
  left: 'env(safe-area-inset-left, 0px)',
  right: 'env(safe-area-inset-right, 0px)',
} as const;

/** Add a base offset (px) to a safe-area inset, e.g. `inset('bottom', 32)`. */
export const inset = (side: keyof typeof SAFE_AREA, base = 0): string =>
  base ? `calc(${base}px + ${SAFE_AREA[side]})` : SAFE_AREA[side];
