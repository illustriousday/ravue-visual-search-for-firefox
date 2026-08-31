# Ravue Privacy Policy

Last updated: August 31, 2026. Applies to the final Ravue 2.1.6 release. The current repackaging updates documentation only; all runtime files remain identical to those in the version approved by the maintainer.

## Summary

Ravue lets you search an image or a selected area with Google Lens. It does not operate an intermediary server, its own account system, advertising, or telemetry. Google receives either the image’s specific URL or the pixels prepared for the search. Images and URLs may contain personal information.

Opening the panel only displays information and controls. The **Select an area** button starts a local capture; choosing **Search this image with Ravue** from the context menu starts the search directly.

## Direct image search

Ravue prioritizes the image URL provided by Firefox. It accepts HTTP or HTTPS, rejects embedded usernames/passwords, and removes the fragment (`#...`). Query parameters (`?...`) are preserved because they may be required to locate the image.

This revision excludes recognizable local addresses from the URL path, such as localhost, intranet hostnames without a domain, known local domains, and recognized local/reserved IP ranges. When possible, Ravue uses the pixel-based paths described below instead. If no permitted local alternative is available, the operation fails and can be replaced with a manual area selection.

Validation remains syntactic: Ravue does not perform DNS lookups, test public accessibility, or inspect every redirect. A seemingly public domain may point to a private origin. Tokens, identifiers, or personal data contained in query parameters are not removed automatically. Do not use the direct path for an image or URL that you do not want to share with Google.

A new tab displays the preparation screen and navigates to `https://lens.google.com/uploadbyurl`, including the image’s specific URL. Google then attempts to retrieve the resource from that origin. Ravue does not resample the file on this path, but it does not control how Google retrieves, processes, or stores it.

If no eligible URL is initially available, Ravue attempts to read the decoded pixels of the full image in the top-level document. If that read is blocked, it may ask Firefox to capture the rendered image rectangle. Ravue does not scroll the page to perform these operations. These fallback paths generate a JPEG at quality 0.94, with a maximum dimension of 1200 pixels on the longest side. They may lose transparency, animation, detail, or other characteristics of the original file.

A Google-side failure after a URL has already been submitted does not automatically trigger a new capture. The user can start a new search with the area selector.

## Area selection

When the selector is opened, Firefox captures the entire visible area of the active tab: the viewport, not the full scrollable page and not the browser chrome. This working image may include text, photographs, and visible form content, including personal data. There is no automatic detection or hiding of sensitive information.

The working PNG and a reduced copy used for analysis, limited to 960 pixels on the longest side, remain in local memory during selection. Visual analysis is performed locally using pixel and document-boundary heuristics; it does not use OCR, a remote artificial intelligence service, or network transmission to suggest the crop.

Single-click, drag, move, resize, and right-click-to-clear actions only adjust the selection. When **Search** is activated, the crop is converted locally to a JPEG with a maximum dimension of 1200 pixels on the longest side. Only that JPEG is delivered to the Google Images file input, whose code starts the search in Lens. If **Visible page** is selected and then confirmed with **Search**, the entire selected viewport is included in the JPEG. The intermediate PNG is not uploaded as a file.

Cancel, Close, or Esc before submission closes the selector. Enter or Space on a button activates that button; Enter while the selection is focused confirms the search. Confirmation with Enter is ignored while text is being composed through an IME.

## Memory and retention

The Manifest V3 background process may be suspended. To pass data between steps, Ravue temporarily stores the final JPEG or image URL, random operation identifiers, the association with the result tab, the current phase, and the expiration time in `browser.storage.session`.

Records become invalid after five minutes. The JPEG is removed when consumed; an in-memory lock prevents simultaneous messages from receiving two copies of the same record. Associations are cleared when the flow completes or ends, or when an access or cleanup operation encounters an expired record.

There is no promise of physical deletion at exactly the five-minute mark: validity and removal are separate mechanisms. Ending the browser session clears this session storage area. The selector’s working capture does not use the same timer and remains available for as long as the selector needs it.

The implementation does not use `storage.local`, `storage.sync`, a proprietary database, or a Ravue server to archive images. It does not guarantee forensic erasure from memory. Normal tab history, cache, and data retained by Google follow the behavior of the browser and the external service.

## Information not added to the search

Ravue does not deliberately add browsing history, cookies, advertising identifiers, usage metrics, or crash reports to the payload. Ravue does not send the page URL as a separate search field. However, an image URL may itself contain identifiers or even a page address in its query parameters, and selected pixels may contain any information visible on screen.

The absence of a Ravue server does not mean that no data leaves the device. Transmission to Google is part of the requested functionality. Normal requests to Google may involve the IP address, headers, existing cookies, and account state according to the browser and the service. Ravue does not control this layer and does not promise anonymity.

## Permissions and sites

- `activeTab`: allows temporary access to the tab activated by the user.
- `menus`: creates context-menu commands and identifies the clicked element.
- `scripting`: injects local helpers and the selection interface.
- `storage`: allows temporary transfer of data and state through `storage.session`.
- `https://images.google.com/*`: allows Ravue to locate the file-search control and deliver the JPEG only when there is a pending operation for that tab.
- `https://lens.google.com/*`: allows Ravue to manage the local preparation overlay for a pending operation.

Permanent access to all websites is not requested. Scripts running on Google Images/Lens hosts check for pending state before creating the preparation overlay or interacting with the upload control. The Lens script does not inspect result content or certify that the search succeeded. On the Lens page, the preparation overlay has a waiting limit. This limit does not apply to the initial wait for Google Images to finish loading: if that load never completes, the preparation screen may remain visible until the user closes the tab.

The required category declared in the manifest is `websiteContent`, which is necessary for visual search. The extension is intended for Firefox Desktop 142 or later.

## Google and independence

Processing by Google is subject to the [Google Privacy Policy](https://policies.google.com/privacy) and the [Google Terms of Service](https://policies.google.com/terms). Ravue has not audited the service’s internal systems.

Ravue is independent and is not affiliated with or endorsed by Google or Mozilla. The [source code repository](https://github.com/illustriousday/ravue-visual-search-for-firefox) is provided exclusively for reference; it is not a support or contribution channel.
