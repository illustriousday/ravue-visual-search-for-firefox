# Ravue — Visual Search for Firefox

Search web images, image files from your computer, or any visible page area with Google Lens in one new tab.

**Source version: 2.1.7 · Manifest V3 · Firefox Desktop 142 or later.**

> **Source code for review only:** this repository exists for transparency and source-code review. It is not a support or contribution channel. Bug reports, support requests, suggestions, feedback, pull requests, and contributions are not accepted.

## Features

- Open a stable Ravue image-input page from the toolbar panel.
- Drop an image anywhere on that page or choose a JPEG, PNG, WebP, GIF, BMP, or AVIF file from the computer.
- Search the clicked web image directly from the context menu.
- Prefer a web image's specific public URL, avoiding a viewport-limited crop.
- Open the established area selector from the panel, context menu, or keyboard shortcut.
- Click for a locally calculated region suggestion, or click and drag to draw manually.
- Move, resize, reset, or right-click to clear a selection before confirmation.
- Select the whole visible viewport, still requiring explicit Search confirmation.
- Keep preparation and results in the same new tab.
- Use English or Brazilian Portuguese according to Firefox's interface language.
- Use light or dark appearance according to the operating-system preference.
- No Ravue intermediary server, advertising, or telemetry.

The accepted 2.1.6 direct-image, selector, preparation, and result flows are preserved in 2.1.7. The new file/drop input is isolated in `popup/image-input.js`, uses a stable extension page because Firefox toolbar popups close when they lose focus, and reuses the existing session-backed handoff.

## How to use

### Drop or choose an image

Open the Ravue toolbar panel and choose **Add an image**. A normal Ravue tab remains open while you either:

1. drag one image file or a web-page image anywhere over that tab and drop it when the full-page target appears; or
2. choose **Choose an image** and select a supported image file.

Dropping or choosing the image is the explicit command to send that image to Google Lens. Merely opening the toolbar panel or image-input page, dragging without dropping, or opening and cancelling the file picker sends nothing. After a successful choice or drop, the same image-input tab becomes the preparation screen and then Google Lens.

JPEG, PNG, and WebP files no larger than 1200 pixels on either side are kept in their existing encoded format when they fit the temporary payload limit. Larger inputs and GIF, BMP, or AVIF files are decoded locally and converted to a still JPEG at quality 0.94, with at most 1200 pixels on the longest side and a white transparency background. The source-file limit is 32 MB. Animation, transparency, metadata, or fine detail may be lost when conversion is required.

A dropped web image may expose its HTTP(S) image URL rather than a local file. If that URL is eligible, Ravue uses the existing URL-priority route and Google retrieves the resource. Query parameters are preserved and may contain sensitive tokens; do not drop a private image or URL you do not want to share with Google.

### Search a complete web image

1. Right-click an image on a regular web page.
2. Choose **Search this image with Ravue**, inside the Ravue submenu when applicable.
3. A new tab opens, shows the preparation screen, and continues to Google Lens.

The command itself confirms submission. It does not open the area selector. Ravue first considers the image's specific HTTP(S) URL. Recognizable local/internal addresses and embedded credentials are excluded; fragments are removed and query parameters are preserved. This is a syntactic check, not DNS validation or proof that Google can retrieve the resource.

If no eligible URL exists, Ravue attempts the complete decoded image pixels in the top-level page and then, when permitted, a rendered-rectangle capture. Those fallbacks produce a JPEG with at most 1200 pixels on the longest side. They do not scroll the page. A Google-side failure after URL submission does not automatically start a second pixel-based submission.

### Select a visible area

Open the toolbar panel and choose **Select an area**, use **Select an area with Ravue** in the context menu, or invoke the configured command.

| Control | Action |
| --- | --- |
| Single left-click | Suggests a region under the pointer |
| Click, hold, and drag | Draws a free-form rectangular selection |
| Drag the selection or a handle | Moves or resizes the selection |
| Right-click in the selector | Clears the current selection without closing it |
| Reset | Clears the current selection |
| Visible page | Selects the whole viewport; does not submit by itself |
| Search | Confirms and submits the selected pixels |
| Cancel, Close, or Esc | Closes the selector before submission |
| Tab / Shift+Tab | Moves through available controls |
| Enter / Space on a button | Activates that button only |
| Enter on the focused selection | Confirms the search |
| Arrow / Shift+Arrow | Moves the selection by 1 / 10 CSS pixels |

Smart selection uses local color, region, and document-boundary heuristics. It is not OCR, does not semantically recognize people or animals, and does not download or call an AI model. When analysis is ambiguous and image boundaries are available, it favors the full image. Always review the boundary before searching.

The selector works from the viewport capture taken when it opens. Close and reopen it after changing page zoom or window size.

## Privacy

For a direct web-image search or a dropped web image, Google receives the image's specific eligible URL. For a chosen/dropped local file, Google receives either its preserved JPEG/PNG/WebP bytes or a locally converted JPEG. The original filename is not used for submission. For area selection, Firefox first captures the **entire visible viewport before cropping**; that working image remains local, and only the confirmed crop is prepared for Google.

Temporary image data, URLs, operation identifiers, result-tab associations, phases, and expiry times use `storage.session`. Records have a logical five-minute lifetime and are removed when consumed, completed, closed, or cleaned after expiry. Ravue does not archive images in `storage.local`, `storage.sync`, or a developer-operated server.

Google Images and Google Lens are external services. Their requests, cookies, account state, normal history, processing, and retention are controlled by Firefox and Google, not Ravue. See [PRIVACY.md](PRIVACY.md).

## Compatibility and permissions

Ravue uses Manifest V3 with a Firefox module event background. Android compatibility is not declared.

| Permission | Purpose |
| --- | --- |
| `activeTab` | Temporary access after an explicit action on the active tab |
| `menus` | Context-menu commands and identification of the clicked image |
| `scripting` | Injection of packaged helpers and the area selector |
| `storage` | Temporary handoff through `storage.session` |
| `https://images.google.com/*` | Delivery of a pending local image/crop through Google's file input |
| `https://lens.google.com/*` | Preparation-cover handling for a pending result tab |

Version 2.1.7 adds no permission and requests no permanent access to all websites. Internal/protected pages and frame, CORS, or CSP restrictions may prevent some existing page-based operations. File choice from the dedicated Ravue page does not require access to the current web page.

Search availability depends on Google. The initial Google Images document-load wait has no local timeout; if the page never finishes loading, the preparation screen may remain until the tab is closed. Later input, post-attachment, and Lens-cover stages have separate bounds. Ravue does not bypass CAPTCHA, authentication, consent, rate limits, or service restrictions.

## Testing and reproduction

The runtime is readable and unminified. No compilation, transpilation, code generation, or bundling is required.

Run the local suite with a compatible Node.js version:

```bash
node --experimental-vm-modules --test tests/*.test.cjs tests/regression/*.test.cjs
```

Optional native pixel tests require the test-only `@napi-rs/canvas` and `sharp` packages. They are not included in the XPI.

Build deterministic archives without transforming source files:

```bash
node tools/package.cjs ../dist
```

The command creates the 2.1.7 XPI and matching source ZIP in `../dist`. See [TEST_MATRIX.md](TEST_MATRIX.md) for the scope and limits of validation.

## Independence and rights

Ravue is an independent project and is not affiliated with, sponsored by, or endorsed by Google or Mozilla. Google Lens and Firefox are trademarks of their respective owners.

All rights are reserved unless the owner states otherwise.
