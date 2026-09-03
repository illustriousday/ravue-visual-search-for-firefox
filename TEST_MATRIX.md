# Validation Matrix — Ravue 2.1.7

Prepared on September 3, 2026. Ravue 2.1.7 is based on the maintainer-accepted 2.1.6 implementation. Its only functional addition is user-initiated image input: a toolbar row opens a stable Ravue page whose entire surface accepts drag and drop and whose button opens a file picker.

**Release status:** maintainer acceptance testing was completed in Firefox Desktop, the release was approved for daily use, and version 2.1.7 was accepted and published on AMO on September 3, 2026. The public AMO listing exposes the expected add-on identity, version, summary, screenshots, description, permissions, data disclosure, categories, tags, privacy-policy link, and installation control.

Automated checks exercise packaged functions with explicit browser/DOM substitutes. Native pixel tests use Skia and libvips, not Gecko. They reduce risk but are not equivalent to an exhaustive Firefox, accessibility, Google-service, signed-update, or AMO review.

## Automated coverage

- **2.1.6 regression lock:** SHA-256 assertions preserve every established content script, selector module, result module, storage module, icon, `popup/popup.js`, fixture, unchanged test, and unchanged verification tool byte for byte.
- **Manifest contract:** the version is 2.1.7; ID, MV3 declarations, minimum Firefox 142, permissions, hosts, `websiteContent`, locale mechanism, and lack of Android declaration remain unchanged.
- **File decoding:** JPEG, PNG, WebP, GIF, BMP, and AVIF; invalid/unsupported files; 32 MB source limit; failed decode/read/encode.
- **Byte preservation:** eligible JPEG, PNG, and WebP remain in their existing encoded format when no resizing is needed and the payload limit is met.
- **Local conversion:** scale to at most 1200 pixels, JPEG quality 0.94, white background, resource cleanup, and a still-image result for animated or alternate formats.
- **Drag representations:** Firefox file-promise URL, HTML image source, URI list, Mozilla URL, plain-text URL, local file priority, multiple/unsupported files, and empty data.
- **Popup/page boundary:** the transient toolbar panel only requests a stable page; file selection and drag listeners exist on the stable page rather than the popup.
- **Stable-page behavior:** full-page overlay, copy drop effect, choose button, progress, one submission, same-tab transition on success, remain open and restore controls on failure.
- **Background boundary:** exact popup and image-page sender authentication; public URL reuse; local image payload reuse; no screenshot, page injection, or selector invocation for the new routes.
- **Existing flows:** direct image URL/pixels, no source-page scrolling, area selection, smart selection, right-click clearing, keyboard and IME behavior, geometry, session lifecycle, Google upload, preparation cover, error handling, concurrency, and CSP fixtures.
- **Packaging:** deterministic ZIP, CRC and round-trip bytes, exact runtime allowlist, XPI/source equality, valid icons, JSON, JavaScript syntax, locale parity, and no packaged tests/dependencies/older archives.

The final validation report records the exact test totals, file counts, hashes, environment, and unavailable external validators. Do not copy counts from an earlier 2.1.6 report.

## Manual Firefox acceptance matrix

The following release checks were accepted by the maintainer in Firefox Desktop. Google-dependent checks confirm the normal user-visible flow available during testing; they do not guarantee the future availability or behavior of Google services. No signing, CSP, consent, CAPTCHA, authentication, or service restriction was bypassed.

| ID | Check | Expected result | Final release status |
| --- | --- | --- | --- |
| P01 | Open panel in English | English controls, version 2.1.7, existing selector button intact | **Passed — Firefox acceptance** |
| P02 | Open panel in Brazilian Portuguese | Portuguese controls selected from browser locale | **Passed — Firefox acceptance** |
| P03 | In the panel, choose Add an image; drag a local JPEG anywhere over the opened page | Full-page drop target appears; that same tab becomes preparation/Lens after drop | **Passed — Firefox acceptance** |
| P04 | Drag PNG/WebP/GIF/BMP/AVIF | Supported input prepares locally and reaches Lens | **Passed — Firefox acceptance** |
| P05 | Drag unsupported/non-image content | Localized error; image-input page remains usable and does not navigate | **Passed — Firefox acceptance** |
| P06 | Drag image over the image-input page, then leave without dropping | Overlay disappears; nothing is sent | **Passed — Firefox acceptance** |
| P07 | Choose image, then cancel picker | Image-input page remains usable; no search is created | **Passed — Firefox acceptance** |
| P08 | Choose small JPEG/PNG/WebP | Correct complete image reaches Lens without visible quality loss | **Passed — Firefox acceptance** |
| P09 | Choose image larger than 1200 px | Correct aspect ratio and whole image after local reduction | **Passed — Firefox acceptance** |
| P10 | Choose transparent or animated input | Still white-backed JPEG where conversion is required, as disclosed | **Passed — Firefox acceptance** |
| P11 | Choose file above 32 MB | Localized size error; control recovers; page does not navigate | **Passed — Firefox acceptance** |
| P12 | Drop a public web image onto the image-input page | Existing URL-priority route; source page unchanged | **Passed — Firefox acceptance** |
| P13 | Drop private/local/authenticated URL | Rejected or fails safely; no alternate unrelated capture | **Passed — Firefox acceptance** |
| R01 | Context-menu complete-image search | Same 2.1.6 flow; no selector and no source-page scrolling | **Passed — regression acceptance** |
| R02 | Selector from panel | Starts empty; click suggestion and manual drag both work | **Passed — regression acceptance** |
| R03 | Move/resize and right-click clear | Existing behavior remains unchanged | **Passed — regression acceptance** |
| R04 | Visible page | Selects viewport but submits only after Search | **Passed — regression acceptance** |
| R05 | Keyboard, IME, cancel, reset, close | Focused control performs only its own action | **Passed — regression acceptance** |
| R06 | Tall image, iframe, lazy loading, object-fit, SVG/WebP | Existing direct/selector behavior remains unchanged | **Passed — regression acceptance** |
| R07 | Zoom and HiDPI | Crop boundaries and orientation remain correct | **Passed — regression acceptance** |
| R08 | Strong CSP and protected pages | Works where permitted or fails visibly without unsafe bypass | **Passed — regression acceptance** |
| R09 | Slow Google load and unavailable control | Existing preparation and failure behavior remains as disclosed | **Passed — live-service acceptance** |
| R10 | Close/retry and background suspension | Temporary state cleans up or resumes without duplicate payload | **Passed — lifecycle acceptance** |
| U01 | Install or update to the AMO-signed 2.1.7 release | Same add-on ID; one extension at version 2.1.7, no duplicate | **Passed — public AMO release available** |
| A01 | AMO validation and review | Submission accepted with the expected public metadata and install control | **Passed — accepted and published on AMO** |

## Local difficult-page fixture

From the extracted source directory:

```bash
node tests/fixture-server.cjs
```

The fixture covers formats, iframes, lazy loading, object-fit, and strong CSP. A loopback-hosted image cannot prove Google's public URL retrieval; use a public, non-sensitive image for that route.

## Release decision and publication record

**Decision: approved.** Ravue 2.1.7 passed the maintainer's Firefox acceptance and regression checks and was accepted and published on AMO on September 3, 2026. The public release retains the expected add-on ID and exposes version 2.1.7 for installation. Future changes require a new regression cycle; this record applies only to the published 2.1.7 release.
