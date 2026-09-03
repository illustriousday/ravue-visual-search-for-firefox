# Validation Matrix — Ravue 2.1.7

Prepared on September 3, 2026. Ravue 2.1.7 is based on the maintainer-accepted 2.1.6 implementation. Its only functional addition is user-initiated image input: a toolbar row opens a stable Ravue page whose entire surface accepts drag and drop and whose button opens a file picker.

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

Use a separate Firefox profile without personal data. Record the exact unsigned XPI hash, Firefox version, operating system, language, theme, zoom, display scale, and result for each executed row. Do not bypass signing, CSP, consent, CAPTCHA, authentication, or Google restrictions.

| ID | Check | Expected result | Evidence status before maintainer testing |
| --- | --- | --- | --- |
| P01 | Open panel in English | English controls, version 2.1.7, existing selector button intact | Pending real Firefox |
| P02 | Open panel in Brazilian Portuguese | Portuguese controls selected from browser locale | Pending real Firefox |
| P03 | In the panel, choose Add an image; drag a local JPEG anywhere over the opened page | Full-page drop target appears; that same tab becomes preparation/Lens after drop | Pending real Firefox |
| P04 | Drag PNG/WebP/GIF/BMP/AVIF | Supported input prepares locally and reaches Lens | Pending real Firefox |
| P05 | Drag unsupported/non-image content | Localized error; image-input page remains usable and does not navigate | Pending real Firefox |
| P06 | Drag image over the image-input page, then leave without dropping | Overlay disappears; nothing is sent | Pending real Firefox |
| P07 | Choose image, then cancel picker | Image-input page remains usable; no search is created | Pending real Firefox |
| P08 | Choose small JPEG/PNG/WebP | Correct complete image reaches Lens without visible quality loss | Pending real Firefox |
| P09 | Choose image larger than 1200 px | Correct aspect ratio and whole image after local reduction | Pending real Firefox |
| P10 | Choose transparent or animated input | Still white-backed JPEG where conversion is required, as disclosed | Pending real Firefox |
| P11 | Choose file above 32 MB | Localized size error; control recovers; page does not navigate | Pending real Firefox |
| P12 | Drop a public web image onto the image-input page | Existing URL-priority route; source page unchanged | Pending real Firefox |
| P13 | Drop private/local/authenticated URL | Rejected or fails safely; no alternate unrelated capture | Pending real Firefox |
| R01 | Context-menu complete-image search | Same 2.1.6 flow; no selector and no source-page scrolling | Pending regression check |
| R02 | Selector from panel | Starts empty; click suggestion and manual drag both work | Pending regression check |
| R03 | Move/resize and right-click clear | Existing behavior remains unchanged | Pending regression check |
| R04 | Visible page | Selects viewport but submits only after Search | Pending regression check |
| R05 | Keyboard, IME, cancel, reset, close | Focused control performs only its own action | Pending regression check |
| R06 | Tall image, iframe, lazy loading, object-fit, SVG/WebP | Existing direct/selector behavior remains unchanged | Pending site matrix |
| R07 | Zoom and HiDPI | Crop boundaries and orientation remain correct | Pending device matrix |
| R08 | Strong CSP and protected pages | Works where permitted or fails visibly without unsafe bypass | Pending browser matrix |
| R09 | Slow Google load and unavailable control | Existing preparation and failure behavior remains as disclosed | Pending live-service matrix |
| R10 | Close/retry and background suspension | Temporary state cleans up or resumes without duplicate payload | Pending lifecycle matrix |
| U01 | Install 2.1.7 over signed 2.1.6 | Same add-on ID; one upgraded extension, no duplicate | Pending signed AMO build |
| A01 | AMO automated validator | Review every warning/error before submission | Pending AMO upload |

## Local difficult-page fixture

From the extracted source directory:

```bash
node tests/fixture-server.cjs
```

The fixture covers formats, iframes, lazy loading, object-fit, and strong CSP. A loopback-hosted image cannot prove Google's public URL retrieval; use a public, non-sensitive image for that route.

## Release decision rule

Do not label the 2.1.7 package final merely because local tests pass. The maintainer should first run at least P01–P13 and R01–R05 in the actual Firefox environment used day to day. Stop publication if the AMO validator adds an unexpected permission, data-disclosure issue, source mismatch, or functional warning.
