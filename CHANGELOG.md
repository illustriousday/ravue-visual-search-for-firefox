# Ravue Changes

## 2.1.8 — pasted image input

Version 2.1.8 adds one optional image-input method without changing the accepted 2.1.7 file selection, drag and drop, page-image, area-selection, preparation, or result flows.

### Added

- The stable **Add an image** page now accepts an image pasted with the browser's normal paste command (`Ctrl+V`, or `Command+V` on macOS).
- Pasted images reuse the existing local file preparation and single-tab Google Lens handoff.
- Both Firefox clipboard file representations are handled: `clipboardData.files` and file entries from `clipboardData.items`.
- Non-image clipboard content is ignored and normal paste behavior is left intact.
- Focused tests cover clipboard extraction, image submission, and non-image paste behavior.

### Preserved from 2.1.7

- File selection and image drag/drop behavior, including supported formats, size limits, conversion rules, progress, and recovery.
- Direct context-menu image search, area selection, preparation, results, session cleanup, and all established keyboard behavior.
- Add-on ID, Manifest V3 architecture, minimum Firefox version, permissions, hosts, data declaration, icons, and localization mechanism.
- No Clipboard API call or clipboard permission was added; image data is read only from a user-generated `paste` event on the stable image-input page.

## 2.1.7 — stable image input

Version 2.1.7 adds two user-initiated ways to search an image without changing the accepted 2.1.6 page-image, area-selection, preparation, or result flows.

### Added

- A new **Add an image** row in the toolbar panel opens a stable Ravue image-input page.
- The complete image-input page is a drop target while an image is being dragged over it.
- A visible **Choose an image** button on that page opens the operating-system file picker without losing the receiving document.
- After a valid choice or drop, that same tab becomes the existing preparation screen and then Google Lens.
- JPEG, PNG, WebP, GIF, BMP, and AVIF inputs are accepted up to 32 MB.
- Eligible JPEG, PNG, and WebP files at or below 1200 pixels are preserved without re-encoding when they fit the temporary payload limit.
- Inputs that need conversion are decoded locally and rendered as a still JPEG at quality 0.94, with at most 1200 pixels on the longest side and a white background.
- Web images dropped as public HTTP(S) addresses reuse the existing URL-priority Lens route.
- Errors remain on the image-input page, restore its control, and do not leave that page when preparation fails.
- English and Brazilian Portuguese messages cover every new control, progress state, and error.
- Focused unit and native-codec tests cover file types, preserved bytes, local conversion, resource cleanup, drop representations, the transient-panel boundary, stable-page behavior, failure recovery, real PNG pass-through, and real oversized-image conversion. Existing integration assertions also cover both new background routes.

### Preserved from 2.1.6

- The toolbar's **Select an area** behavior and its original `popup.js` controller.
- Direct context-menu image search, including URL priority and pixel/capture fallbacks.
- Empty-start selector, smart click suggestion, manual drag, move, resize, right-click clear, keyboard handling, and Visible page confirmation.
- No automatic scrolling of the source page.
- The preparation screen and Lens result using the same new tab.
- Existing Google Images load, input, post-attachment, Lens-cover, expiry, and cleanup behavior.
- Add-on ID, Manifest V3 architecture, minimum Firefox version, permissions, hosts, data declaration, icons, and automatic UI localization.

All established content scripts, selector modules, result modules, storage modules, icons, `popup/popup.js`, and existing tests outside the explicit 2.1.7 test additions remain byte-for-byte identical to the accepted 2.1.6 source. Documentation is now maintained in English as the source default; the runtime interface continues to follow Firefox's English or Brazilian Portuguese locale.

## 2.1.6 — stable base

- Completed the public Manifest V3 transition for Firefox Desktop 142 or later.
- Added the toolbar panel, local click-to-suggest selection, right-click clearing, and session-backed handoff.
- Prioritized the image's specific eligible URL for direct image searches.
- Preserved pixel and rendered-rectangle fallbacks without scrolling the source page.
- Kept preparation and results in one new tab.
- Corrected keyboard confirmation, pending-state cleanup, duplicate payload consumption, recognizable local-address exclusion, and light-theme contrast.
- Restored the accepted Google Images initial-load behavior: wait for document completion or `load`, without an added local timeout at that first stage.

## Public transition 1.4.1 → 2.1.6

- Migrated from Manifest V2 to Manifest V3.
- Moved transient handoff state to `storage.session`.
- Added `scripting`, `storage`, and `images.google.com` access required by the new architecture; changed `contextMenus` to `menus`.
- Did not request permanent all-sites access and did not declare Android compatibility.

Intermediate internal version numbers were not required to be published.
