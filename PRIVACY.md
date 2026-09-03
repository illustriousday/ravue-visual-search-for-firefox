# Ravue Privacy Policy

Last updated: September 3, 2026. Applies to Ravue 2.1.8.

## Summary

Ravue provides user-initiated visual search with Google Lens. You can search a complete image from a web page, open Ravue's stable image-input page to paste, choose, or drop an image, or confirm a selected visible area. Ravue has no intermediary server, account system, advertising, or telemetry.

Opening the toolbar panel or image-input page, copying without pasting, opening and cancelling the file picker, dragging without dropping, or adjusting an area selection does not transmit an image. Transmission starts only as the direct consequence of the command you complete: pasting an image on Ravue's image-input page, choosing a file, dropping an image, choosing **Search this image with Ravue**, or confirming an area with **Search**.

Google receives either an eligible image URL or image pixels prepared for the requested search. Images and URLs may contain personal or sensitive information. Review what you choose before starting a search.

## Pasted, chosen, or dropped image files

The dedicated Ravue image-input page accepts pasted, chosen, or dropped JPEG, PNG, WebP, GIF, BMP, and AVIF image files up to 32 MB. Ravue reads and decodes that image locally.

- An eligible JPEG, PNG, or WebP no larger than 1200 pixels on either side is kept in its existing encoded format when it also fits the temporary 8 MiB data-URL limit.
- Larger inputs and GIF, BMP, or AVIF inputs are rendered locally to a still JPEG at quality 0.94, with no more than 1200 pixels on the longest side.
- The conversion uses a white background. Transparency, animation, metadata, color-profile behavior, or fine detail may be lost when conversion is required.
- The original local filename and local filesystem path are not used for submission. The temporary file presented to Google has a generic Ravue filename.

The resulting image is placed in temporary session storage and delivered to the file input on Google Images, which starts the Lens search. No copy is sent to a Ravue server.

If several files are dropped or present in one clipboard event, Ravue uses the first supported image. Unsupported pasted content is ignored or rejected locally and is not sent.

## Dropped web images

When a web-page image is dragged into the image-input page, Firefox may provide an image file or an image URL. A provided file follows the local-file process above. A provided URL follows the URL-priority process below.

Ravue does not fetch a dropped remote URL itself. If the address is eligible, Google receives the address and attempts to retrieve the image from its source. Merely dragging over the image-input page does not send the URL; dropping is the explicit search command.

## Direct web-image and URL-priority search

For **Search this image with Ravue**, and for a dropped web image represented by an address, Ravue considers the specific URL supplied by Firefox. It accepts HTTP or HTTPS, rejects embedded usernames/passwords, removes the fragment (`#...`), and preserves query parameters (`?...`) because they may be required to locate the image.

Recognizable local/internal addresses are excluded from URL delivery, including localhost, common local domains, intranet hostnames without a domain, and recognized private/reserved IP ranges. Validation is syntactic: Ravue does not perform DNS lookups, prove public accessibility, inspect every redirect, or remove identifiers and secret tokens from query parameters. A seemingly public hostname may still resolve privately. Do not use this route for an image or URL you do not want to share with Google.

The result tab navigates to `https://lens.google.com/uploadbyurl` with the specific eligible image URL. Ravue does not resize or re-encode the image on this route. Google may be unable or unauthorized to retrieve temporary, authenticated, origin-restricted, or otherwise inaccessible resources.

When the context-menu command has no eligible URL, Ravue may attempt the complete decoded image pixels in the top-level document and then, when Firefox permits it, a capture of the rendered image rectangle. Ravue does not scroll the page. These fallback routes create a JPEG at quality 0.94 and at most 1200 pixels on the longest side. They may lose transparency, animation, metadata, or detail. An inaccessible frame without an eligible URL fails rather than capturing unrelated pixels.

A Google-side failure after an eligible URL has been submitted does not automatically trigger a new pixel capture or a second submission.

## Area selection

When the selector opens, Firefox captures the **entire visible area of the active tab before cropping**: the viewport, not the full scrollable page and not the browser chrome. The working PNG can include text, photographs, visible form content, and other personal information. Ravue does not automatically detect, blur, or redact sensitive content.

The working PNG and a local analysis copy, limited to 960 pixels on the longest side, remain in local memory while the selector is open. Visual analysis is performed locally through packaged pixel and document-boundary heuristics. It does not use OCR, a remote AI service, downloaded models, or network transmission.

Clicking, dragging, moving, resizing, resetting, choosing **Visible page**, and right-clicking to clear only adjust the selection. **Visible page** selects the full viewport but does not submit it. When **Search** is activated, only the confirmed selected region is converted locally to a JPEG at quality 0.94 with at most 1200 pixels on the longest side, then delivered through the Google Images file input. The full intermediate PNG is not uploaded as a file unless the user explicitly selects and confirms the complete visible viewport.

Cancel, Close, or Esc before confirmation closes the selector without submitting the image.

## Temporary memory and retention

Ravue's Manifest V3 event background can be suspended between steps. The requested search therefore uses `browser.storage.session` to hold only the temporary final image payload or eligible URL, a random operation identifier, its result-tab association, the processing phase, and an expiry time.

Records become logically invalid after five minutes. Image payloads are removed when consumed. Associations are cleared when the flow completes, the result tab closes, or expired records are encountered during cleanup. An in-memory single-consumer guard prevents simultaneous messages in the same background instance from receiving duplicate copies.

Logical expiry and physical removal are separate operations, so removal at the exact millisecond of expiry is not promised. Firefox clears session storage when the browser session ends. The selector's working screenshot has a separate in-memory lifetime and remains only while the selector needs it.

Ravue does not archive images in `storage.local`, `storage.sync`, a proprietary database, or a developer-operated server. It does not promise forensic erasure from browser memory. Normal tab history, cache, and data retained by Google follow browser and service behavior.

## Information not deliberately added

Ravue does not send the page URL as a separate field and does not deliberately append browsing history, cookies, advertising identifiers, usage metrics, crash reports, or the original local filename to the search payload. However, a specific image URL may itself contain a page address, token, or identifier in its query parameters, and selected, pasted, or chosen pixels may contain any visible information.

The absence of a Ravue server does not mean that no data leaves the device. Google transmission is the requested function. Normal requests to Google can involve the IP address, request headers, existing Google cookies, account state, and browser history according to Firefox and Google's services. Ravue does not control those layers and does not promise anonymity.

## Permissions and sites

- `activeTab`: temporary access to the active tab after an explicit user action.
- `menus`: context-menu commands and identification of the clicked image.
- `scripting`: injection of packaged helpers and the area selector.
- `storage`: temporary transfer through `storage.session`.
- `https://images.google.com/*`: delivery of a pending image or crop to Google's file input.
- `https://lens.google.com/*`: management of Ravue's preparation cover for a pending result tab.

Version 2.1.8 adds no permission, including no clipboard permission, and requests no permanent access to all websites. Ravue does not call the Clipboard API; it receives an image only from a user-generated paste event while the dedicated image-input page is open. Scripts on Google Images and Lens first check whether their exact tab has a pending Ravue operation. Ravue does not inspect Lens result content to evaluate its meaning or quality.

The manifest declares required `websiteContent` transmission for visual search. Pasting, choosing, and dropping an image are single-use, purpose-limited actions initiated by the user on Ravue's dedicated image-input page. The AMO listing and in-product image-input page state that the pasted, chosen, or dropped image is sent to Google Lens.

## Google and independence

Google's handling is subject to the [Google Privacy Policy](https://policies.google.com/privacy) and [Google Terms of Service](https://policies.google.com/terms). Google may show consent, authentication, CAPTCHA, rate limits, or other service controls. Ravue does not bypass them.

Ravue is independent and is not affiliated with, sponsored by, or endorsed by Google or Mozilla. The [source-code repository](https://github.com/illustriousday/ravue-visual-search-for-firefox) is maintained exclusively for transparency and review, not for support or contributions.
