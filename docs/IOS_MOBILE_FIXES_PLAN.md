# iOS / Mobile Deep-Diagnosis Scan — Fixes Plan

A fresh pass focused on the **iOS Safari / mobile-webkit** layer, after the
earlier `MOBILE_FIXES_PLAN.md` and `LAYOUT_FIXES_PLAN.md` work shipped (single
`SettingsProvider`, one `<Toolbar />` spacer, merged mobile theme, `100dvh`
migration, un-nested `<Container>`s, ES2020 target, the bottom-sheet panel,
the desktop width/offset math). Those plans fixed the **layout geometry**.
This scan covers what they did not touch: **safe-area handling for
`position: fixed` chrome, iOS WebKit media/audio/speech gating, and
text-selection ergonomics** — the things that break specifically on a real
iPhone/iPad rather than in desktop DevTools device emulation.

Each item: **symptom → root cause → fix → effort/risk**. Severity tiers:
Tier 0 = visible/functional bug on iOS today; Tier 1 = correctness on iOS;
Tier 2 = polish/consistency.

> **Status:** Diagnosis only. This document is the record/rationale; the fixes
> are intended to land as small, reviewable follow-up PRs (see execution
> order).

---

## Why the existing safe-area handling is not enough

`index.html` applies the four `env(safe-area-inset-*)` paddings to **`body`**,
and `<meta name="viewport" ... viewport-fit=cover>` opts the page into drawing
under the notch/home-indicator. That correctly insets **normal-flow** content
(everything inside `#root`).

The gap: `position: fixed` elements are laid out against the **viewport
(initial containing block)**, *not* the padded `body` box, so the body
padding does **nothing** for them. Every fixed element in the app therefore
draws edge-to-edge into the unsafe regions:

- `AppBar` — `position="fixed"` (`NavBar.tsx:198`)
- desktop side panel — `position: 'fixed'` (`Layout.tsx:105`)
- Diary FAB — `position: 'fixed', bottom: 32, right: 32` (`Diary.tsx:159`)

This is the root cause shared by M1 and M4 below.

---

## Tier 0 — Visible / functional bugs on iOS

### M1 Fixed `AppBar` ignores the safe-area insets → toolbar clipped by the notch 🔴

- **Symptom:** With `viewport-fit=cover`, in **landscape** on a notched
  iPhone the AppBar's left edge (hamburger menu in mobile, app title) is
  drawn **under the notch / camera housing** and is partially unreachable.
  In installed/standalone PWA mode (`apple-mobile-web-app-capable=yes`) the
  same applies to the top inset.
- **Root cause:** The `AppBar` is `position="fixed"` (`NavBar.tsx:198`) and
  its `Toolbar` (`NavBar.tsx:205`) has no `env(safe-area-inset-*)` padding.
  The `body` padding in `index.html` does not reach fixed elements (see
  "Why the existing safe-area handling is not enough"). So the toolbar
  content butts against the physical screen edge / notch.
- **Fix:** Pad the AppBar/Toolbar for the insets directly, e.g.
  `paddingLeft: 'env(safe-area-inset-left)'`,
  `paddingRight: 'env(safe-area-inset-right)'`, and
  `paddingTop: 'env(safe-area-inset-top)'` on the `AppBar` root (with the
  `@supports` no-inset fallback already used elsewhere). The spacer
  `<Toolbar />` then needs to grow by the same top inset so content still
  clears the now-taller bar — derive it from `theme.mixins.toolbar` +
  `env(safe-area-inset-top)`.
- **Effort:** ~45 min. **Risk:** low-medium (touch the AppBar + its spacer
  together; verify portrait, landscape-left, landscape-right, and standalone).

### M2 Auto-pronounce never fires on iOS (speech outside a user gesture) 🔴

- **Symptom:** With "auto-speak each new card" enabled, the word is spoken on
  desktop/Android but is **silent on iOS** — and even the **first** manual
  tap of the speaker button can be swallowed.
- **Root cause:** iOS Safari only allows `speechSynthesis.speak()` after the
  API has been "unlocked" by a real user gesture. Auto-speak is driven by a
  `useEffect` on card change (`FlashCard.tsx:29-34`) — not a gesture — so iOS
  drops it. There is no first-gesture unlock anywhere, so the synth stays
  locked until/unless a tap happens to land inside the allowance window.
- **Fix:** On the first user interaction (e.g. a one-time
  `pointerdown`/`click` listener in `PronunciationProvider`), "unlock" the
  synth by speaking an empty/space utterance, then mark it ready. Gate
  `autoSpeak` on that ready flag so the toggle's behavior is honest on iOS
  (it starts working from the first tap onward instead of never).
- **Effort:** ~1 hr. **Risk:** low-medium (platform-specific; test on a real
  device).

### M3 Pomodoro break cue is silent on iOS (suspended AudioContext + no vibrate) 🟠

- **Symptom:** When a Pomodoro interval ends, the chime/vibration does not
  fire on iOS, so the break transition is unannounced.
- **Root cause:** `playNotificationCue()` (`notification-sound.ts`) creates a
  **fresh** `AudioContext` inside a **timer callback** (`:18-24`). On iOS an
  `AudioContext` created/resumed outside a user gesture starts `suspended`
  and produces no sound. Separately, `navigator.vibrate` (`:12-16`) is
  **not implemented in iOS Safari at all**, so the vibration fallback is a
  no-op there too. Net: nothing happens on iOS.
- **Fix:** Create **one** shared `AudioContext` and `resume()` it on a user
  gesture (e.g. when the user starts the Pomodoro timer), then reuse it for
  the cue instead of `new AudioCtx()` per fire. Keep `vibrate` as an
  Android-only best-effort. Optionally surface a visual/`document.title`
  flash as the cross-platform fallback since audio autoplay is unreliable on
  mobile generally.
- **Effort:** ~1 hr. **Risk:** low-medium.

---

## Tier 1 — Correctness on iOS

### M4 Diary FAB ignores the home-indicator / notch insets 🟡

- **Symptom:** The Diary "add entry" FAB sits at a fixed `32px` from the
  bottom-right. On iPhones with a home indicator it crowds/overlaps the
  indicator in portrait, and in landscape it can land under the notch side.
- **Root cause:** `Fab` is `position: 'fixed', bottom: 32, right: 32`
  (`Diary.tsx:159`) with no `env(safe-area-inset-*)` offset; like all fixed
  elements it doesn't inherit the body inset padding.
- **Fix:** Offset by the insets, e.g.
  `bottom: 'calc(32px + env(safe-area-inset-bottom))'` and
  `right: 'calc(32px + env(safe-area-inset-right))'`.
- **Effort:** ~10 min. **Risk:** very low.

### M5 iOS `speechSynthesis` cancel-then-speak race can wedge audio 🟡

- **Symptom:** Rapidly tapping the speaker (or switching cards fast) can leave
  speech **stuck** — no audio until the page is reloaded.
- **Root cause:** `speak()` calls `window.speechSynthesis.cancel()` and then
  immediately `speak()` (`speech.ts:110-125`). On iOS WebKit this exact
  sequence is the documented way to wedge the queue (`cancel()` leaves the
  engine in a state where the next `speak()` is dropped). The companion iOS
  bug (utterances pausing after ~15s without a `pause()`/`resume()` kick)
  doesn't bite single words but is the same root fragility.
- **Fix:** After `cancel()`, defer the `speak()` to the next tick (or call
  `speechSynthesis.resume()` before speaking) so the engine isn't asked to
  cancel and start in the same synchronous frame. Guard with the iOS check
  so other platforms keep the snappy immediate path.
- **Effort:** ~30 min. **Risk:** low (isolated to the speech util).

### M6 Global `user-select: none` blocks copying words/definitions 🟡

- **Symptom:** On mobile you cannot long-press to select/copy a vocabulary
  word, its definition, or a translation to paste into a dictionary/notes —
  the whole UI is unselectable.
- **Root cause:** `index.html` sets `* { -webkit-user-select: none;
  user-select: none }` globally (`:32-36`) to get an app-like feel, then
  re-enables selection only on `input, textarea`. For a **vocabulary/study**
  app, the study content (word, definition, translation, diary text) is
  exactly what users want to select.
- **Fix:** Keep the non-selectable default for interactive chrome
  (buttons/nav) but opt study/reading content back in — either flip the
  global rule to allow selection and disable it only on controls
  (`button, .MuiButtonBase-root { user-select: none }`), or add a
  `user-select: text` rule on the FlashCard text and Diary/definition
  surfaces. Lower-risk: opt-in `text` on the specific reading surfaces.
- **Effort:** ~30 min. **Risk:** low (visual/UX only).

---

## Tier 2 — Polish / consistency

### M7 `100dvh` has no fallback for engines without dynamic-viewport units 🟢

- **Symptom:** On iOS < 15.4 (and any engine lacking `dvh`) the declaration is
  dropped entirely, so the full-height shells get **no** `minHeight`/`height`
  and can collapse.
- **Root cause:** `100dvh` is used bare (no preceding `vh`/`%` fallback) in
  `Layout.tsx:31,66,108`, `Onboarding.tsx:63`, and `Study.tsx:275`. The
  original mobile plan explicitly called for a `vh` fallback
  (`['100vh','100dvh']`) but the implementation kept dvh-only.
- **Fix:** Emit a `vh` (or `%`) declaration immediately before the `dvh` one
  so non-supporting engines get a usable value and supporting ones override
  it. A tiny helper (`fullHeight = { minHeight: '100vh', '@supports
  (height:100dvh)': { minHeight: '100dvh' } }`) keeps it DRY.
- **Effort:** ~30 min. **Risk:** very low. (Low priority given current iOS
  share — trivial but mostly future-proofing/old-device safety.)

### M8 FlashCard gradient text can flash invisible on iOS 🟢

- **Symptom:** The big word occasionally renders **blank** on iOS during the
  card's opacity/visibility transition.
- **Root cause:** The word uses `WebkitBackgroundClip: 'text'` +
  `WebkitTextFillColor: 'transparent'` (`FlashCard.tsx:69-70`) inside a
  `Card` with `overflow: 'hidden'` and an adjacent fading answer block. On
  some iOS versions the clipped-text paint drops out under compositing, and
  with `transparent` fill there's no fallback color → invisible word.
- **Fix:** Set a concrete `color` (e.g. `primary.main`) on the `Typography`
  as the base, and only layer the gradient clip via `@supports
  (-webkit-background-clip: text)`. The word is then never blank, just
  un-gradiented on the rare failing path.
- **Effort:** ~20 min. **Risk:** very low.

### M9 Onboarding full-screen shell isn't safe-area aware 🟢

- **Symptom:** The first-run guide renders **outside** `Layout` (no NavBar
  chrome) at `minHeight: '100dvh'` (`Onboarding.tsx:63`); its bottom
  continue/language buttons can sit under the home indicator on tall
  iPhones.
- **Root cause:** The centered `Paper` is fine, but the shell's `p: 2`
  doesn't add the bottom/side insets, and it's the only top-level surface not
  benefiting from the AppBar offset.
- **Fix:** Add `env(safe-area-inset-bottom)` (and left/right) to the shell
  padding. Pairs naturally with M1's safe-area helper.
- **Effort:** ~10 min. **Risk:** very low.

---

## Suggested execution order (small, reviewable PRs)

1. **PR A — Safe-area for fixed chrome (M1, M4, M9):** introduce a small
   safe-area padding helper and apply it to the AppBar+spacer, Diary FAB, and
   Onboarding shell. Highest visible iOS payoff; share one helper.
2. **PR B — iOS speech (M2, M5):** first-gesture unlock + cancel/speak
   de-race in the pronunciation layer. Test on a real device.
3. **PR C — iOS audio cue (M3):** shared, gesture-resumed `AudioContext`.
4. **PR D — Selection + polish (M6, M8, M7):** opt study content back into
   text selection, gradient-text fallback, `dvh` fallback helper.

Each PR ships with `npm run build` + `npm test` green and — because these are
WebKit-specific — at least one pass on a **real iOS Safari** (portrait,
landscape-left/right, and installed-to-home-screen standalone), not just
DevTools device emulation.

---

## Quick reference — files touched

| Item | Primary file(s) |
| --- | --- |
| M1 AppBar safe-area | `src/components/NavBar.tsx` |
| M2 auto-speak gesture-gate | `src/context/PronunciationContext.tsx`, `src/components/FlashCard.tsx` |
| M3 Pomodoro audio cue | `src/utils/notification-sound.ts`, `src/context/SettingsContext.tsx` |
| M4 Diary FAB insets | `src/pages/Diary.tsx` |
| M5 speech cancel/speak race | `src/utils/speech.ts` |
| M6 text selection | `index.html`, `src/components/FlashCard.tsx`, `src/pages/Diary.tsx` |
| M7 `dvh` fallback | `src/components/Layout.tsx`, `src/components/onboarding/Onboarding.tsx`, `src/pages/Study.tsx` |
| M8 gradient text fallback | `src/components/FlashCard.tsx` |
| M9 Onboarding safe-area | `src/components/onboarding/Onboarding.tsx` |
</content>
