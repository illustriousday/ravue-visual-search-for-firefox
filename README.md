# Ravue — Visual Search for Firefox

Visual search with Google Lens: search an image from the page or select any visible area and search it in a new tab.

**Source version: 2.1.6 · Manifest V3 · Firefox Desktop 142 or later.**

> **Repository for reference only:** this repository provides Ravue’s source code for transparency and reference. Bug reports, support requests, suggestions, feedback, pull requests, and contributions are not accepted.

## Features

- Panel with explanations and a button to open the area selector.
- Search the clicked image directly from the context menu without opening the selector.
- Prefer the image’s specific URL, avoiding crops limited by the visible screen area.
- Manual click-and-drag selection and locally calculated click-based region suggestions.
- Move and resize the selected area.
- Right-click to clear the current selection without closing the selector.
- Option to select the entire visible page area and confirm the search.
- Preparation and results use the same new tab, without a separate upload tab.
- Brazilian Portuguese and English; panel and preparation screen support light and dark themes.
- No Ravue intermediary server, advertising, or telemetry.

The source page is not scrolled automatically. The selector starts empty; the full visible page is selected only through the **Visible page** command.

## How to use

### Panel and context menu

Click the Ravue icon, then select **Select an area**. The context menu also provides **Select an area with Ravue**. The configurable Alt+Shift+V shortcut remains available; its promotional line is not displayed in the panel.

### Search an entire image

1. Right-click the image.
2. Choose **Search this image with Ravue**, inside the Ravue submenu when applicable.
3. A new tab opens, displays the preparation screen, and continues to the search.

This command itself confirms submission. It does not open the area selector or request an additional confirmation.

When accepted, the image’s HTTP(S) URL is sent to Google Lens so the service can retrieve the resource directly. Ravue does not resample the image on this path. The URL must be accessible to Google; authentication requirements, origin restrictions, and temporary links may prevent the search from working.

Recognizable local/internal addresses and URLs containing embedded usernames or passwords do not use this path. This check is syntactic only; it does not perform DNS resolution or prove that a resource is publicly accessible. URL parameters are preserved, so do not use sensitive or private links that you do not want to share.

If the URL is not eligible, Ravue attempts to use the image pixels decoded from the element in the top-level document and, if necessary and permitted, a capture of the rendered image rectangle. These paths produce a JPEG with a maximum dimension of 1200 pixels on the longest side without scrolling the page; they do not preserve the original file bytes. If a URL has already been submitted and later fails on Google’s side, Ravue does not automatically perform a new capture. Use the area selector as an alternative.

### Select an area

| Control | Action |
| --- | --- |
| Single left-click | Suggests a region under the pointer |
| Click, hold, and drag | Draws a free-form rectangular selection |
| Drag the selection or its handles | Moves or resizes the selection |
| Right-click inside the selector | Clears the selection without closing the selector |
| Reset | Clears the current selection |
| Visible page | Selects the entire viewport; does not submit by itself |
| Search | Confirms submission of the selected area |
| Cancel, Close, or Esc | Closes the selector before submission |
| Tab / Shift+Tab | Moves through the available controls |
| Enter / Space on a button | Activates that button |
| Enter while the selection is focused | Confirms the search |
| Arrow keys / Shift+Arrow keys | Moves the selection by 1 / 10 CSS pixels |

Smart selection uses local heuristics based on colors, regions, and document boundaries. It is not OCR, does not perform semantic recognition of people or animals, and does not download AI models. When analysis is ambiguous, it favors the full image when its boundaries are available. Suggestions may be inaccurate, so review and adjust the selection before searching.

To change browser zoom or window size while using the selector, close and reopen it. The selector operates on a capture taken when it was opened.

## Privacy

For direct image searches, Google receives either the image’s specific URL or a JPEG prepared through a local fallback path.

When the area selector is opened, Firefox captures the **entire viewport before cropping**. The working PNG and its analysis remain local. After confirmation, only the JPEG corresponding to the selected area is delivered to Google Images to initiate the Lens search. If you confirm the entire visible page, all of that visible content is included in the JPEG. Personal information present in the pixels is not automatically removed or hidden.

The final JPEG, URL, and handoff state between steps use `storage.session`. Records have a logical lifetime of five minutes and are removed when consumed, when the process ends, or when expired records are cleaned up. The selector’s working capture has a separate lifecycle. `storage.local` and `storage.sync` are not used to archive images.

Google Images/Lens is an external service. Google’s rules, cookies, normal tab history, processing, and retention are not controlled by Ravue. Read the [privacy policy](PRIVACY.md).

## Compatibility and permissions

This version uses Manifest V3 with a module-based event background implementation specific to Firefox. Android compatibility is not declared.

| Permission | Purpose |
| --- | --- |
| `activeTab` | Temporary access to the tab activated by the user |
| `menus` | Context-menu commands and identification of the clicked element |
| `scripting` | Injection of local helpers and the area selector |
| `storage` | Temporary data handoff through `storage.session` |
| `https://images.google.com/*` | Delivery of the JPEG to the file input of a pending search |
| `https://lens.google.com/*` | Preparation coverage in the search tab |

Ravue does not request permanent access to all websites. Internal/protected pages and frame, CORS, or CSP restrictions may prevent some operations. Images inside inaccessible frames may still use an eligible URL; local fallback paths do not capture another frame as a substitute.

Search availability and results depend on Google. Before submitting a JPEG, Ravue waits for the Google Images page to finish loading. This initial wait has no local timeout: if the load event never occurs, the preparation screen may remain visible until the user closes the tab. Later stages include failure handling, but there is no guaranteed maximum duration for the entire search process. Ravue does not bypass CAPTCHA, authentication, consent prompts, or service restrictions.

## Testing and development

The runtime source is original, readable, and unminified. No compilation, transpilation, or bundling is required to run it.

With a compatible Node.js version:

```bash
node --experimental-vm-modules --test tests/*.test.cjs tests/regression/*.test.cjs
