# Publication of the final Ravue 2.1.6 release

Documentation aligned on August 31, 2026 for the public update from 1.4.1 → 2.1.6. The maintainer tested the scenarios that had failed in the previous review, approved the behavior, and authorized repackaging solely to correct the documentation.

## Identity and repackaging scope

- Name: Ravue — Visual Search for Firefox.
- Version: 2.1.6; Manifest V3.
- ID: `{351e58ce-b7a8-4e88-b53f-d23acc464659}`.
- Minimum Firefox Desktop version: 142.0; no Android compatibility declared.
- Permissions preserved: activeTab, menus, scripting, storage, images.google.com and lens.google.com.
- Declared transmitted-data category: websiteContent.
- Keep All Rights Reserved and the GitHub repository for reference only.

The XPI contains 31 files; only README.md and PRIVACY.md were updated. The source ZIP contains 69 files; in addition to those two documents, CHANGELOG.md, TEST_MATRIX.md and AMO_PUBLICATION.md were updated. All other files remain identical to those in the pair accepted during the maintainer's testing. There were no changes to code, tests, manifest, permissions, styles, interface, icons, or submission methods. The previous files were preserved separately.

Delivery packages:

- `ravue-visual-search-v2.1.6-final.xpi` — unsigned; 70881 bytes; SHA-256 `693573af60bdceb97bf28cf4a71954bdc7a863defff49cf5ff65356c05120148`.
- `ravue-visual-search-v2.1.6-final-source.zip` — matching source, with manifest.json at the root and no other embedded packages.

The new hashes differ from the previous packages because of the documentation changes. Do not use a hash or report from another revision merely because it is also named 2.1.6. The hash of the source ZIP itself is calculated externally after packaging, avoiding a circular reference.

## Validation and limitations

The automated reference for this implementation contains 179 passing tests: 166 unit/regression tests and 13 native-codec tests, including 12 upload-loading scenarios. The tests and tools are preserved without modification. Verification of this repackaging reruns the suite and compares every file against the accepted baseline.

API/DOM tests use explicit substitutes; native codecs use Skia/libvips, not Gecko. Thousands of independent tests are not attributed to the geometry samples. The suite checks 42 syntax files and 3 JSON files.

The maintainer reported successful Firefox results for the scenarios that had previously failed. Formal records covering the entire matrix by browser, operating system, duration, or scenario were not provided. The report is not presented as an exhaustive matrix.

The official validator was not available in the preparation environment; check its result during the AMO upload. Signed installation/update from 1.4.1 to 2.1.6 still needs to be verified. There is no promise of Mozilla approval, permanent Google availability, or absolute absence of defects. See [TEST_MATRIX.md](TEST_MATRIX.md).

## Technical points now reflected in the documentation

The initial Google Images wait uses document completion or load, exactly as in the behavior restored from 2.1.5. Submission does not start on DOMContentLoaded. There is no local timeout for this initial wait; if load never occurs, the preparation screen may remain until the user closes the tab.

Separate limits still exist at different stages: 12 seconds to wait for the file input when necessary, 20 seconds after attaching the file, and an independent 30-second limit for the overlay on the Lens page. These limits do not form a global deadline for search completion.

Submission through the image's specific URL, local fallback paths, the selector, right-click behavior, keyboard handling, preparation in the same tab, and the absence of automatic scrolling were not changed by this repackaging.

## Publish one step at a time

1. Use the existing Ravue listing. Do not create another extension or change the ID.
2. Upload the final XPI and verify the version, platform, permissions, and validator result. If an error, warning, or unavailability of version number 2.1.6 appears, stop and evaluate it; do not modify the package to work around the platform.
3. For the source-transformation question, answer No for this runtime. The files are readable; there is no compilation, transpilation, minification, or bundling. The packager only collects them. If requested, provide the matching source ZIP. [Mozilla source-code criteria](https://extensionworkshop.com/documentation/publish/source-code-submission/).
4. Fill in the reviewer notes and release notes using the sections in this document. Continue to respond to private requests from Mozilla even though the public GitHub repository does not provide support.
5. Update the listing text and privacy policy, keeping the presentation aligned with the version actually offered to the public.
6. Review the final screenshots before submitting them. Do not expose personal data.
7. After approval/publication, verify the offered version, installation, signed update, and both search flows. Signing changes the file hash; keep the signed XPI separately.

Nothing was published to AMO or changed remotely on GitHub by this document.

## Listing fields

| Field | Value |
| --- | --- |
| Name | Ravue — Visual Search for Firefox |
| Existing slug | ravue-visual-search-firefox |
| Default language | Brazilian Portuguese |
| Homepage | https://github.com/illustriousday/ravue-visual-search-for-firefox |
| Support and contributions | Keep fields empty and public channels disabled |
| License | Keep All Rights Reserved |
| Categories | Search Tools; Photos, Music & Videos |
| Tags | google; image search; search |
| Privacy policy | Copy PRIVACY.md from this source in full |
| Experimental / payment | Keep the final free-release decision |

Check the preview and accepted format for each field. Do not paste Markdown link syntax into a field that does not support it; use the full URL when necessary.

## Summary

Search whole images or visible page areas with Google Lens. Click or drag to select, review your crop, and open results in a new tab.

## Description

Search visually with Ravue: use an image from the page or choose a visible area to look up with Google Lens.

### Panel and quick access

Open Ravue's toolbar panel and choose **Select an area**. You can also start from the context menu.

### Search a whole image

Right-click an image and choose **Search this image with Ravue**. The extension prioritizes the image's specific URL so Google can retrieve the resource without cropping it to the visible screen boundaries. This requires the address to be accessible to Google.

### Select your way

Click once to suggest a region, or click, hold, and drag to draw freely. Move and resize the selection before searching. Suggestions use local heuristics; review the boundaries before confirming.

### Correct without restarting

Right-click inside the selector to clear the current selection and choose another without closing it. **Visible page** selects the entire viewport; confirm with **Search** to send it.

### One new search tab

The original page is not automatically scrolled. The new tab shows **Preparing your search** during the transition to Google Lens, without creating a second helper upload tab. Result availability depends on Google's services.

### Privacy and control

For direct search, Google receives the image's specific URL, including query parameters, or a locally prepared JPEG when the URL is not eligible. Recognizable local addresses are excluded from URL delivery, but Ravue does not verify public accessibility through DNS or automatically remove query tokens. Avoid private images or sensitive links. Failure after a URL has already been sent does not automatically trigger another capture.

The area selector first captures the entire visible viewport locally, then crops it. Click suggestions do not use OCR or remote AI. After confirmation, the selected area's JPEG is delivered to Google Images to start a Lens search. Review the selected content: its pixels may contain personal information. Local image alternatives produce JPEGs with a maximum dimension of 1200 pixels on the longest side.

Ravue has no intermediary server, advertising, or telemetry. Google's processing is subject to its own terms and privacy policy. See the extension's privacy policy for details.

The interface supports Brazilian Portuguese and English. Requires Firefox Desktop 142 or later.

### Source code for reference

https://github.com/illustriousday/ravue-visual-search-for-firefox

The repository is provided for transparency and source-code reference only. Support requests, bug reports, suggestions, feedback, pull requests, and contributions are not accepted.

Ravue is independent and is not affiliated with, sponsored by, or endorsed by Google or Mozilla. Google Lens and Firefox are trademarks of their respective owners.

## Release notes

Ravue 2.1.6 — update from public version 1.4.1

- Migrates to Manifest V3 for Firefox Desktop, minimum version 142.
- Adds a toolbar panel with an introduction and controls.
- Supports manual drag selection and local click-to-suggest regions.
- Right-click clears a selection without restarting the selector.
- Direct image search prioritizes the image URL without limiting the resource to the viewport.
- Local pixel/capture alternatives remain available when no URL is eligible.
- Preparation and results share one new tab; the original page is not automatically scrolled.
- Fixes keyboard confirmation, expired-state handling, and concurrent image consumption.
- Crop delivery waits for the Google Images page to finish loading, preserving the accepted upload flow.
- Excludes recognizable local addresses from URL delivery and improves light-theme text contrast.
- Expands privacy documentation and tests.

Crop delivery uses the Google Images file input. Compared with 1.4.1, scripting, storage, and images.google.com permissions are new; no permanent all-sites access is requested. The keyboard shortcut remains available without its promotional row in the panel. Brazilian Portuguese and English are supported.

## Notes for Reviewers

Copy the content below into the private reviewer field without copying this instruction.

RAVUE 2.1.6 — PUBLIC UPDATE FROM 1.4.1

### IDENTITY

Name: Ravue — Visual Search for Firefox  
Add-on ID: {351e58ce-b7a8-4e88-b53f-d23acc464659}  
Manifest version: 3  
Extension version: 2.1.6  
Minimum Firefox Desktop: 142.0  
No Android compatibility is declared.

This updates the existing Ravue listing. The maintainer accepted the 2.1.6 implementation after testing the restored upload flow in the previously failing scenarios, then authorized a documentation-only repack. All non-documentation files remain byte-for-byte identical to that accepted base, including every executable, manifest, CSS, HTML, localization file, icon, test, and packaging tool. Only README.md and PRIVACY.md changed inside the XPI; the source ZIP also updates CHANGELOG.md, TEST_MATRIX.md and AMO_PUBLICATION.md. There is no version, ID, permission, or behavior change in this repack.

No Ravue account, login, or developer-provided credentials are required. Google Images/Lens may present its own consent, login, rate limit, or CAPTCHA. Ravue does not bypass those controls.

### CHANGES SINCE 1.4.1

The update migrates from MV2 to Firefox MV3 and adds the toolbar panel, local click-to-suggest selection, right-click clearing, URL-priority image search, and session-backed handoff. The event background is a packaged module using background.scripts/type module, not a Chrome service worker.

The retained changes correct Enter handling on focused selector buttons, pending-operation expiry and preparation-cover cleanup, duplicate consumption of stored JPEGs, recognizable local URL handling, and two light-theme text colors. The direct-image route does not open the area selector. Preparation and results share the same newly opened tab; no helper tab or automatic source-page scrolling is used.

Before this documentation-only repack, the last executable change had restored only waitForDocumentComplete in content/google-upload.js to the 2.1.5 behavior. It waits for document.readyState === “complete” or the window load event before touching the upload controls. It does not start on DOMContentLoaded, and the additional 30-second deadline previously introduced for this initial wait is absent. This initial wait has no local timeout: if load never occurs, the preparation cover may remain until the user closes the tab. The existing 12-second file-input wait, 20-second post-attachment timer, and separate 30-second Lens-page cover deadline remain. These are different stages, not an overall search-duration guarantee.

### TEST STEPS

#### Test 1 — direct image search

1. Open a normal page with a public, non-sensitive image, including a tall image. Right-click and choose **Search this image with Ravue**. Check that no selector appears, the original page does not scroll, and one new tab proceeds from preparation to Lens results for the image resource.

#### Test 2 — area selection

2. Open the toolbar panel and choose **Select an area**. The selector starts empty. Click for a suggestion, right-click to clear, then drag manually. Move/resize and choose **Search**. Check that only the confirmed region appears in the JPEG used for the search. **Visible page** first selects the viewport and still requires Search confirmation.

3. Use Tab to focus each control. Enter/Space should activate that button, not accidentally submit from Cancel, Reset, Close, or Visible page. Escape cancels before submission. Test expired operations, slow loading, closed result tabs, and unavailable Google controls. Distinguish the initial Google Images load wait (no local deadline, as disclosed above) from later input, submission, and Lens-page error/expiry handling.

4. The source includes synthetic fixtures for image formats, frames, and CSP. Loopback images cannot be fetched publicly by Google; use a genuine public image for the URL route. The full matrix remains useful for zoom, HiDPI, lazy loading, object-fit, host-permission changes, and signed-update testing. Daily-use acceptance is not a claim that every matrix entry was individually completed.

### DATA FLOW AND PRIVACY

Direct image search first considers the image's HTTP(S) URL. Embedded credentials and recognizable local/intranet/private literal addresses are excluded, the fragment is removed, and query parameters are preserved. The result tab navigates to https://lens.google.com/uploadbyurl with that specific image URL. Ravue does not resize or re-encode the image on this eligible-URL path.

Eligibility is syntactic: it does not verify DNS/public reachability, inspect all redirects, or remove secret query tokens. A URL may be temporary or unavailable to Google. A failed URL already submitted does not automatically trigger JPEG resubmission.

If the URL is initially ineligible, Ravue attempts the complete decoded image pixels in the main document, or a rendered-rectangle capture when permitted, without scrolling. Those alternatives generate JPEG at quality 0.94 and at most 1200 pixels on the longest edge; they are not copies of the original file bytes. Inaccessible frames without an eligible URL fail rather than capturing the wrong frame.

Area selection begins with a local PNG of the entire visible tab viewport, before cropping. A local analysis copy is limited to 960 pixels on its longest edge. Suggestions use packaged DOM/pixel heuristics, not OCR, remote AI, or downloaded models. Only the confirmed region is encoded into the final JPEG. Pixels may contain personal information; Ravue does not redact them.

For JPEG delivery, the same new tab navigates to https://images.google.com/. A packaged content script first checks for a pending Ravue operation belonging to that tab, mounts the preparation cover, locates Google's image-search/file input, assigns a File, and dispatches input/change. Google's page performs the upload. Ravue's fetch of a data URL only decodes local bytes.

The Lens script releases the preparation cover after readiness or failure/expiry handling. Readiness is not semantic validation of search quality or HTTP success. No service restrictions are bypassed.

The final JPEG or image URL and operation association use browser.storage.session with a logical five-minute validity limit. JPEGs are removed on consumption; associations are cleaned on completion, closure, or expired-record cleanup. Exact physical deletion at expiry is not promised. The selector's working screenshot has a separate local in-memory lifetime. Ravue does not archive images in storage.local, storage.sync, or a developer server. Normal Google requests, cookies, browser history, and Google's retention are outside Ravue's control.

### PERMISSIONS

activeTab: temporary access following explicit user action.  
menus: context commands and identification of the clicked element.  
scripting: injection of packaged selector/helper code.  
storage: temporary storage.session handoff.  
https://images.google.com/*: JPEG delivery through Google's file input for a pending Ravue tab.  
https://lens.google.com/*: preparation-cover handling for a pending result tab.

Required transmitted-data category: websiteContent. Compared with 1.4.1, scripting, storage, and images.google.com are additions; contextMenus becomes menus. There is no permanent all-sites host permission.

### VALIDATION EVIDENCE

The maintainer's everyday-use acceptance is a report provided for this release. Exact Firefox/OS versions, duration, and per-scenario manual records were not supplied, so none are invented here.

The local automated suite contains 179 tests: 166 unit/regression tests and 13 native pixel-processing tests using Skia/libvips. The recorded validation of this implementation passed all 179 without failures, skipped, or cancelled tests. The suite includes 12 loading-event regression scenarios. Tests execute the real packaged functions with explicit browser/DOM doubles; native codecs are not Gecko. The suite is rerun as part of the documentation-only release check. All 31 XPI files must match the corresponding source ZIP files byte-for-byte. All 64 non-Markdown source files and all 29 non-Markdown XPI members must remain identical to the accepted test package; no test source was changed to permit this repack.

The recorded automated-validation environment did not have Firefox or web-ext/addons-linter installed. No official-validator pass, exhaustive Firefox test matrix, or signed 1.4.1-to-2.1.6 upgrade is claimed. The AMO validation result is to be checked during submission. No approval or guaranteed external-service availability is asserted.

### SOURCE AND REPRODUCTION

The runtime has no compilation, transpilation, bundling, minification, remote executable code, or obfuscation. Packaging copies readable JS, CSS, HTML, JSON, SVG, documentation, and image assets into an XPI. Native image libraries are test-only and are not included in the XPI. The source-transformation answer is No for this runtime; the exact matching source ZIP is available if requested.

The matching source ZIP contains 69 files, including README.md, PRIVACY.md, CHANGELOG.md, TEST_MATRIX.md, this publication guide, tests, fixtures, and tools/package.cjs. The five Markdown documents were aligned to the accepted implementation; previous statements about a universal preparation deadline are corrected. The accepted original archives remain preserved separately. The new archive hashes differ because of documentation only.

To reproduce the XPI on Node.js, extract the source ZIP and run:

```bash
node tools/package.cjs ../dist-reproducao
