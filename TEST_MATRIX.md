# Validation Matrix — final Ravue 2.1.6 release

Documentation update: August 31, 2026. The maintainer reported successful Firefox results for the scenarios that had failed in the previous review and approved the baseline. The current repackaging changes documentation only; no test or runtime code was modified.

The reference automated validation contains 179 passing tests: 166 unit/regression tests and 13 tests using native codecs. Everyday-use acceptance is not equivalent to an exhaustive manual test matrix. **The official AMO result and the signed update still require evidence.**

## Automated validations

- Main suite: original tests preserved, with release contracts explicitly updated for the fixes and new regressions.
- KEY-01 regressions: Enter on Cancel, Reset, Close, or Visible page does not submit the selection. Native button activation is preserved; IME composition is ignored.
- LENS-02 regressions: on the Lens page, expiry, negative response, message failure, and the local timeout release the overlay.
- Google Images loading: 12 regression scenarios cover waiting for the document to reach complete or for load before manipulating the upload controls. DOMContentLoaded does not trigger submission early. There is no local timeout for this initial wait; if load never occurs, the overlay may remain until the user closes the tab.
- Single consumption: simultaneous calls do not receive duplicate copies of the JPEG.
- URLs: recognizable local addresses are excluded; eligible URLs and image parameters remain preserved.
- Geometry: 10,000 deterministic samples and cases covering boundaries, scaling, and proportions.
- Native images: PNG → crop → JPEG at six scales; 288×412 image; tall image; transparent PNG, WebP, SVG; full-bitmap fallback and invalid decoding.
- Package: syntax/JSON, local resources, PNG icons, translations, permissions, hashes, CRC, and XPI/source equality.
- Contrast: base color pairs for small light-theme text exceed 4.5:1. This is not a WCAG certification of the entire interface.

API tests use explicit browser/DOM substitutes. Native tests use Skia and libvips, not Gecko. The 10,000 samples are part of existing tests; they are not thousands of independent tests. Publication information is contained in AMO_PUBLICATION.md within this source package and does not depend on an older publication kit.

## Real-world test matrix and evidence log

In this table, “pending” means there is no individual formal evidence for that scenario; it does not invalidate or turn the maintainer's approved-use report into exhaustive testing. Record only what is actually executed.

Use a separate profile with no personal information. Record the exact Firefox version, operating system, language, zoom, DPR/scale, permissions, and package SHA-256. Do not disable signing, CSP, or Google protections to force success.

| ID | Check | Local evidence / pending item |
| --- | --- | --- |
| F01 | Installation on minimum Firefox 142 and the installed stable version | Manifest validated; installation pending |
| F02 | Signed update 1.4.1 → 2.1.6, same ID, no duplicate | Identity compared; real update pending |
| F03 | PT-BR/EN panel, version, button, and absence of shortcut row | Code/translations tested; rendering pending |
| F04 | Panel, menu, and shortcut start with an empty selector | Logic tested; Firefox interaction pending |
| F05 | Small, large, and taller-than-screen public images | Route tested, without capture/scroll; Google result pending |
| F06 | Image inside same-origin and cross-origin iframes | Routes simulated; real permission behavior pending |
| F07 | blob/data sources, JPEG, PNG, WebP, SVG, and transparency | Native pixels/formats tested; Gecko/CORS pending |
| F08 | Lazy loading, picture/srcset, image still decoding | Partial local cases; real sites pending |
| F09 | object-fit, borders/padding, object-position | Geometry tested; real CSS/rendering pending |
| F10 | Zoom 80/100/125/150/200%; DPR 1/1.25/1.5/2/3 | Math and pixels tested; Firefox/OS pending |
| F11 | Strong CSP and capture outside the viewport without shifting | Fixture and calls tested; Gecko security pending |
| F12 | Smart click, drag, move, eight handles, and right-click | Logic tests passed; visual usability pending |
| F13 | Large text, captions, speech bubbles, photos of people/animals | Synthetic heuristics; do not claim semantic recognition |
| F14 | Enter/Space on every button, Tab/Shift+Tab, Esc, and arrow keys | Regressions passed; real keyboard/screen reader pending |
| F15 | Visible page submits only after Search; cancel does not submit | Logic tested; real interaction pending |
| F16 | Preparation in the same tab and corresponding result | State and per-stage waits tested; no global timeout for Google Images load; real scenario matrix pending |
| F17 | Offline, missing input, expiry, 403, CAPTCHA, and consent | Failures simulated; real Google pending, no bypass |
| F18 | Close result during preparation and retry; background restart | Cleanup/resume simulated; real suspension pending |
| F19 | Two activations, two windows, concurrency | Locks and single consumption tested; real interaction pending |
| F20 | Switch active tab during capture | Rejection tested; Firefox pending |
| F21 | Revoke/grant each Google/Lens host permission | Static permissions; real experience pending |
| F22 | Containers, cookies, and private window | Not validated; check before advertising compatibility in these contexts |
| F23 | Themes, contrast, reduced motion, and interface scaling | Base colors/CSS inspected; visual composition pending |
| F24 | Official validator on final XPI | Not executed in this environment |
| F25 | Final XPI/source and signed runtime | Local package comparison; non-documentation files identical to accepted baseline; future signing pending |

## Difficult-page test lab

From the source directory:

```bash
node tests/fixture-server.cjs
