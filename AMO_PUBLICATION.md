# Ravue 2.1.7 — AMO Publication Material

Prepared on September 3, 2026 for an update of the existing Ravue listing from 2.1.6 to 2.1.7. Nothing in this document publishes or signs the add-on.

## Identity and scope

- Name: Ravue — Visual Search for Firefox
- Add-on ID: `{351e58ce-b7a8-4e88-b53f-d23acc464659}`
- Version: 2.1.7
- Manifest: V3, Firefox module event background
- Minimum Firefox Desktop: 142.0
- Android: not declared
- Existing permissions: `activeTab`, `menus`, `scripting`, `storage`
- Existing host permissions: `https://images.google.com/*`, `https://lens.google.com/*`
- Required transmitted-data category: `websiteContent`
- Primary listing/document language: English
- Runtime UI: English or Brazilian Portuguese according to Firefox
- License: All Rights Reserved
- Repository: transparency and source-code review only; no public support or contribution channel

Version 2.1.7 adds only a toolbar row that opens a stable Ravue image-input page, whole-page image drag and drop there, a file-picker button, the isolated local preparation required by those inputs, their localized messages, and their tests/documentation. It adds no permission, host, remote code, account, server, telemetry, advertisement, or background collection.

The accepted 2.1.6 content scripts, selector modules, result modules, storage modules, icons, and original `popup/popup.js` remain byte-for-byte identical. The new controller is `popup/image-input.js`; in the transient toolbar popup it only requests `upload.html`, while the stable page owns the file picker and drag listeners. The background authenticates each exact packaged sender and stages a validated URL or image payload for the existing same-tab result flow.

## Final artifacts

The unsigned XPI fingerprint below is reproducible from this source. The source archive cannot contain its own final byte length or SHA-256 without changing those values; record them from the final delivery handoff instead of inserting self-referential metadata here.

| Artifact | Files | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| `ravue-visual-search-v2.1.7.xpi` | 34 | 80,493 | `c6aac7c2f8842b6a83125e88d4e0860030e5ba3fc5482eaa5969c932c5cae7e4` |
| `ravue-visual-search-v2.1.7-source.zip` | 74 | Recorded in the external delivery checksum | Recorded in the external delivery checksum |

The XPI must be an unsigned local candidate until AMO signs it. AMO signing changes the distributed XPI hash. The source ZIP has `manifest.json` at its root and contains no XPI, older ZIP, executable dependency, or generated runtime.

## AMO listing fields

| Field | Value |
| --- | --- |
| Existing add-on | Update the current Ravue listing; do not create a duplicate |
| Name | Ravue — Visual Search for Firefox |
| Default listing language | English |
| Homepage | https://github.com/illustriousday/ravue-visual-search-for-firefox |
| Support / contributions | Leave public channels empty or disabled |
| License | All Rights Reserved |
| Categories | Search Tools; Photos, Music & Videos |
| Suggested tags | google; image search; visual search |
| Privacy policy | Publish the complete matching `PRIVACY.md` |
| Source-code question | **No** — no compilation, transpilation, minification, generation, or bundling |

### Summary

Search web images, image files from your computer, or any visible page area with Google Lens. Open Ravue's image page to drop or choose a file, or use its local area selector.

### Description

Ravue makes visual search in Firefox simple, direct, and controlled by an explicit user action.

Search a web image from its context menu, open Ravue's dedicated image page to drop or choose an image, or select any visible area of a page. Each search opens in one new tab and continues to Google Lens while the source page remains unchanged.

#### Drop or choose an image

Open the toolbar panel and choose **Add an image**. Ravue opens a normal, stable tab where you can drop an image anywhere or choose **Choose an image** to select a local file. Ravue supports JPEG, PNG, WebP, GIF, BMP, and AVIF files up to 32 MB.

JPEG, PNG, and WebP are preserved without re-encoding when their dimensions and temporary payload size allow it. Inputs that require conversion are processed locally as a still JPEG, limited to 1200 pixels on the longest side. Choosing or dropping the image is the explicit command to send it to Google Lens; opening the toolbar panel or image page, or cancelling the picker, sends nothing. After a valid input, that same tab becomes Ravue's preparation screen and then Google Lens.

#### Search a complete web image

Right-click an image and choose **Search this image with Ravue**. When possible, Ravue gives Google the image's specific eligible URL so the resource is not limited to the visible screen area. The address must be accessible to Google. If the URL is initially unavailable or ineligible, Ravue can use the existing local pixel/rendered-image fallback when Firefox permits it, without scrolling the source page.

#### Select any visible area

Open **Select an area** from the panel or context menu. Click once for a locally calculated region suggestion, or click, hold, and drag to draw freely. Move or resize the boundary, right-click to clear it without restarting, and confirm only when satisfied. **Visible page** selects the viewport but still requires Search confirmation.

Suggestions use packaged pixel and document-boundary heuristics. They do not use OCR, a remote AI service, or downloaded models, and they do not semantically recognize people or animals. Review the proposed boundary before searching.

#### Privacy and control

For an eligible web image URL, Google receives that specific URL, including any query parameters. Recognizable local addresses and embedded credentials are excluded, but Ravue does not perform DNS verification or remove tokens from a URL. Do not search a private image or sensitive URL you do not want to share.

For a chosen/dropped file or local fallback, Ravue locally prepares the image and passes it through the Google Images file input. For area selection, Firefox first captures the entire visible viewport locally before cropping; nothing is sent while the selection is adjusted. Only the chosen/dropped image or confirmed crop is used for the requested search. Pixels can contain personal information and are not automatically redacted.

Temporary payloads and operation state use Firefox session storage with a logical five-minute lifetime. Ravue has no intermediary server, advertising, or telemetry. Google processing, cookies, account state, history, and retention are governed by Firefox and Google's services. See the privacy policy for complete details.

#### Compatibility and independence

Ravue uses Manifest V3 and requires Firefox Desktop 142 or later. The interface follows Firefox's English or Brazilian Portuguese locale and supports light and dark appearance.

Search results depend on Google Images and Google Lens. Ravue does not bypass consent, authentication, CAPTCHA, rate limits, or service restrictions.

Source code: https://github.com/illustriousday/ravue-visual-search-for-firefox

The repository is maintained exclusively for transparency and source-code review. Support requests, bug reports, suggestions, feedback, pull requests, and contributions are not accepted.

Ravue is independent and is not affiliated with, sponsored by, or endorsed by Google or Mozilla. Google Lens and Firefox are trademarks of their respective owners.

### Release notes

Ravue 2.1.7 adds two optional image-input methods while preserving the accepted 2.1.6 search and selector behavior:

- Open a stable image-input page from the Ravue toolbar panel.
- Drop an image anywhere on that page or choose a local image through its dedicated button.
- Supports JPEG, PNG, WebP, GIF, BMP, and AVIF up to 32 MB.
- Preserves eligible JPEG/PNG/WebP bytes; converts only when necessary.
- Reuses the existing URL-priority route for dropped web images.
- Adds localized progress, validation, and recovery messages.
- Adds no permission, host, tracking, server, or remote code.
- Keeps direct image search, area selection, right-click clear, keyboard handling, no-scroll behavior, and the single result-tab flow unchanged.

## Notes for Reviewers (concise private field)

Copy only the block below into the private reviewer field.

```text
RAVUE 2.1.7 — UPDATE FROM 2.1.6

IDENTITY
Existing add-on ID: {351e58ce-b7a8-4e88-b53f-d23acc464659}
Manifest V3; Firefox Desktop 142+; no Android declaration.

SCOPE
This update adds only (1) a toolbar row that opens a stable packaged image-input page, (2) whole-page image drag/drop there, and (3) a Choose an image button there. Firefox toolbar popups are transient, so file picking and drag handling deliberately occur in upload.html, not inside the popup. No permission, host, data category, remote code, server, account, telemetry, or advertising was added. Existing direct-image, selector, Google preparation, and result behavior is preserved. Established content/selector/result/storage modules, icons, and popup/popup.js match the accepted 2.1.6 source byte for byte. New UI logic is isolated in popup/image-input.js, upload.html, and ui/upload.css. The background addition accepts only messages from the exact packaged popup or image-page URL and stages a validated URL/image for the existing same-tab result flow.

TEST
1. Open the toolbar panel and choose “Add an image”. Verify one normal Ravue image-input tab opens. Drag a public, non-sensitive web image anywhere over that page; a full-page target appears. Drop it and verify that same tab becomes the preparation screen and then Lens.
2. From the stable image-input page, choose “Choose an image” and select JPEG, PNG, WebP, GIF, BMP, or AVIF (<=32 MB). Canceling the picker sends nothing. Unsupported/oversized input shows an error, restores the button, and keeps the page open.
3. Regression: right-click a web image and use “Search this image with Ravue”; verify no selector and no source-page scroll. Open “Select an area”; verify click suggestion, manual drag, move/resize, right-click clear, Visible page requiring Search, and keyboard controls.

DATA FLOW
Choosing or dropping is the deliberate single-use command. A dropped web-image URL uses the existing syntactically validated HTTPS/HTTP URL route; fragments are removed and query parameters preserved. Ravue does not fetch that URL. Local JPEG/PNG/WebP bytes are preserved when <=1200 px and within the temporary payload cap. Other/larger supported inputs are decoded locally into a still JPEG (quality .94, max side 1200, white background). The original local filename/path is not submitted. The payload then uses the existing storage.session -> results.html -> Google Images file-input handoff. Temporary records are logically valid for five minutes. No unrelated data is appended.

CONSENT AND DISCLOSURE
The image-input page and AMO listing state that the chosen/dropped image is sent to Google Lens. No data is sent by opening the toolbar panel or image page, hovering a drag, canceling the picker, or adjusting a crop. This is purpose-limited, user-initiated single-use transmission. Required manifest category remains websiteContent.

SOURCE
Readable, unminified source; no compilation, transpilation, code generation, or bundling. Answer No to the source-transformation question. tools/package.cjs only creates deterministic archives. No credentials are required. Google may show consent/login/CAPTCHA/rate limits; Ravue does not bypass them.
```

## Validation disclosure

The final local report must be read together with [TEST_MATRIX.md](TEST_MATRIX.md). Local automated and native-codec tests are not Firefox or the AMO validator. This preparation environment did not contain Firefox, `web-ext`, or `addons-linter`; no official validation, signed-update result, exhaustive accessibility audit, or guaranteed Google availability is claimed.

## Submission sequence

1. Upload the final 2.1.7 XPI to the existing listing.
2. Stop and inspect every AMO validator warning or error; do not alter the package merely to bypass the platform.
3. For **Does this add-on require source code?**, select **No** because the runtime is already readable and not transformed. If Mozilla separately requests source, provide the exact matching source ZIP.
4. Paste the concise reviewer block and 2.1.7 release notes.
5. Update the English summary, description, and complete privacy policy.
6. Add or replace screenshots only with real 2.1.7 Firefox captures showing no personal information, including the stable image-input page if this feature is illustrated. Existing screenshots of unchanged selector/context-menu behavior may remain if they still match.
7. After signing/publication, verify upgrade from signed 2.1.6, both new panel inputs, direct image search, and area selection. Keep the signed XPI separately because its hash differs from the unsigned candidate.

## Reproduction

Extract the matching source ZIP and run from its root:

```bash
node tools/package.cjs ../dist
```

The command performs deterministic packaging only and must reproduce the unsigned XPI bytes recorded in this document.
