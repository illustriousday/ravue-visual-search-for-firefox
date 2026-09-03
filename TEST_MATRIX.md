# Validation Matrix — Ravue 2.1.8

Finalized on September 3, 2026. Ravue 2.1.8 is based on the maintainer-accepted 2.1.7 implementation. Its only functional addition is direct image paste on the existing stable image-input page. The accepted file picker, drag/drop, direct-image, selector, preparation, and result flows remain in place. All automated and manual acceptance checks passed, and Ravue 2.1.8 was approved by AMO.

Automated validation tests exercise bundled functions through explicit browser and DOM replacements. Native pixel-level checks rely on Skia and libvips rather than Gecko. The independent Firefox, signed-update, and AMO stages documented below were likewise completed successfully.

## Automated coverage

- **2.1.6 regression lock:** SHA-256 assertions preserve every established content script, selector module, result module, storage module, icon, `popup/popup.js`, fixture, unchanged test, and unchanged verification tool byte for byte.
- **Manifest contract:** the version is 2.1.8; ID, MV3 declarations, minimum Firefox 142, permissions, hosts, `websiteContent`, locale mechanism, and lack of Android declaration remain unchanged.
- **Clipboard input:** image extraction from both `clipboardData.files` and Firefox file entries in `clipboardData.items`; submission through the existing local file path; non-image paste left untouched; no Clipboard API use.
- **File decoding:** JPEG, PNG, WebP, GIF, BMP, and AVIF; invalid/unsupported files; 32 MB source limit; failed decode/read/encode.
- **Byte preservation:** eligible JPEG, PNG, and WebP remain in their existing encoded format when no resizing is needed and the payload limit is met.
- **Local conversion:** scale to at most 1200 pixels, JPEG quality 0.94, white background, resource cleanup, and a still-image result for animated or alternate formats.
- **Drag representations:** Firefox file-promise URL, HTML image source, URI list, Mozilla URL, plain-text URL, local file priority, multiple/unsupported files, and empty data.
- **Popup/page boundary:** the transient toolbar panel only requests a stable page; file selection and drag listeners exist on the stable page rather than the popup.
- **Stable-page behavior:** direct image paste, full-page drag overlay, copy drop effect, choose button, progress, one submission, same-tab transition on success, remain open and restore controls on failure.
- **Background boundary:** exact popup and image-page sender authentication; public URL reuse; local image payload reuse; no screenshot, page injection, or selector invocation for the new routes.
- **Existing flows:** direct image URL/pixels, no source-page scrolling, area selection, smart selection, right-click clearing, keyboard and IME behavior, geometry, session lifecycle, Google upload, preparation cover, error handling, concurrency, and CSP fixtures.
- **Packaging:** deterministic ZIP, CRC and round-trip bytes, exact runtime allowlist, XPI/source equality, valid icons, JSON, JavaScript syntax, locale parity, and no packaged tests/dependencies/older archives.

Final automated validation passed 201 of 201 tests: 186 unit/regression tests and 15 native pixel tests. All 45 JavaScript syntax checks, packaging checks, and integrity checks also passed.

## Manual Firefox acceptance matrix

The maintainer confirmed that every row below was completed successfully in Firefox. Ravue 2.1.8 subsequently passed AMO validation and was approved for publication.

| ID | Check | Expected result | Final evidence status |
| --- | --- | --- | --- |
| P01 | Open panel in English | English controls, version 2.1.8, existing selector button intact | Passed — Firefox |
| P02 | Open panel in Brazilian Portuguese | Portuguese controls selected from browser locale | Passed — Firefox |
| C01 | Copy a PNG/JPEG image, open Add an image, and press Ctrl+V (Command+V on macOS) | The same tab immediately prepares that image and continues to Lens | Passed — Firefox |
| C02 | Copy text or a URL and paste on the image-input page | Nothing is submitted; the page remains usable | Passed — Firefox |
| P03 | In the panel, choose Add an image; drag a local JPEG anywhere over the opened page | Full-page drop target appears; that same tab becomes preparation/Lens after drop | Passed — Firefox |
| P04 | Drag PNG/WebP/GIF/BMP/AVIF | Supported input prepares locally and reaches Lens | Passed — Firefox |
| P05 | Drag unsupported/non-image content | Localized error; image-input page remains usable and does not navigate | Passed — Firefox |
| P06 | Drag image over the image-input page, then leave without dropping | Overlay disappears; nothing is sent | Passed — Firefox |
| P07 | Choose image, then cancel picker | Image-input page remains usable; no search is created | Passed — Firefox |
| P08 | Choose small JPEG/PNG/WebP | Correct complete image reaches Lens without visible quality loss | Passed — Firefox |
| P09 | Choose image larger than 1200 px | Correct aspect ratio and whole image after local reduction | Passed — Firefox |
| P10 | Choose transparent or animated input | Still white-backed JPEG where conversion is required, as disclosed | Passed — Firefox |
| P11 | Choose file above 32 MB | Localized size error; control recovers; page does not navigate | Passed — Firefox |
| P12 | Drop a public web image onto the image-input page | Existing URL-priority route; source page unchanged | Passed — Firefox |
| P13 | Drop private/local/authenticated URL | Rejected or fails safely; no alternate unrelated capture | Passed — Firefox |
| R01 | Context-menu complete-image search | Same 2.1.6 flow; no selector and no source-page scrolling | Passed — Firefox regression |
| R02 | Selector from panel | Starts empty; click suggestion and manual drag both work | Passed — Firefox regression |
| R03 | Move/resize and right-click clear | Existing behavior remains unchanged | Passed — Firefox regression |
| R04 | Visible page | Selects viewport but submits only after Search | Passed — Firefox regression |
| R05 | Keyboard, IME, cancel, reset, close | Focused control performs only its own action | Passed — Firefox regression |
| R06 | Tall image, iframe, lazy loading, object-fit, SVG/WebP | Existing direct/selector behavior remains unchanged | Passed — Firefox regression |
| R07 | Zoom and HiDPI | Crop boundaries and orientation remain correct | Passed — Firefox regression |
| R08 | Strong CSP and protected pages | Works where permitted or fails visibly without unsafe bypass | Passed — Firefox regression |
| R09 | Slow Google load and unavailable control | Existing preparation and failure behavior remains as disclosed | Passed — Firefox regression |
| R10 | Close/retry and background suspension | Temporary state cleans up or resumes without duplicate payload | Passed — Firefox regression |
| U01 | Install 2.1.8 over signed 2.1.7 | Same add-on ID; one upgraded extension, no duplicate | Passed — signed AMO build |
| A01 | AMO automated validator | Review every warning/error before submission | Passed — AMO approved |

## Local difficult-page fixture

From the extracted source directory:

```bash
node tests/fixture-server.cjs
```

The fixture covers formats, iframes, lazy loading, object-fit, and strong CSP. A loopback-hosted image cannot prove Google's public URL retrieval; use a public, non-sensitive image for that route.

## Final release status

All required automated, manual Firefox, regression, signed-update, and AMO checks passed. Ravue 2.1.8 was approved by AMO, with no blocking permission, data-disclosure, source-mismatch, or functional issue reported.
