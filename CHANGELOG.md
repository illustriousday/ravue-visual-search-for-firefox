# Ravue Changes

## 2.1.6 — final frozen release

The maintainer approved the baseline after testing the scenarios that had failed in the previous review. On August 31, 2026, the maintainer authorized repackaging this same version solely to correct README.md, PRIVACY.md, CHANGELOG.md, TEST_MATRIX.md, and AMO_PUBLICATION.md. Runtime files, the manifest, interface, tests, and tools were not changed; the previous packages have been preserved. The hashes of the new ZIP/XPI files differ because of the documentation changes.

Before this documentation-only repackaging, the baseline already contained the fixes listed below. It is not byte-for-byte identical to the original 2.1.6 candidate or to 2.1.5; the initial upload-wait function had been restored exactly to the 2.1.5 behavior.

- Fixes Enter handling in the selector: the focused button keeps its own action, preventing unintended searches when cancelling, resetting, closing, or selecting the visible page.
- Prevents unintended confirmation during IME text composition.
- Restores waiting for Google Images to finish loading before manipulating the upload controls, without starting early on DOMContentLoaded and without the additional 30-second timeout that had been introduced at this stage. The initial wait has no local timeout; if load never occurs, the preparation screen may remain visible.
- Keeps the later-stage handling: up to 12 seconds to wait for the file input when necessary, 20 seconds after attaching the file, and an independent 30-second limit for the overlay on the Lens page.
- Prevents duplicate consumption of a JPEG by simultaneous calls within the same background instance.
- Excludes recognizable local/internal addresses from the URL path while preserving the existing local fallback paths.
- Improves two light-theme text colors without changing the panel layout.
- Preserves the implementation tests and adds regression coverage for the restored wait behavior. The recorded validation contains 179 passing local tests; this is not equivalent to exhaustive Firefox testing or AMO approval.
- In the authorized documentation-only repackaging, aligns the five documents with the final behavior and consolidates publication text in AMO_PUBLICATION.md. No executable fix was added at this stage.

Permissions, ID, version, submission methods, smart-selection heuristics, drag behavior, right-click behavior, absence of automatic scrolling, and use of the same result tab were preserved. URL eligibility remains syntactic; parameters required to locate the resource are preserved.

## Public update 1.4.1 → 2.1.6

- Migration from Manifest V2 to Manifest V3 on Firefox Desktop, with minimum version 142.
- Module-based event background and temporary state through storage.session.
- Extension toolbar panel with introduction and controls.
- Local click-based selection suggestions and manual drag selection.
- Right-click to clear a selection without restarting the selector.
- Direct search prioritizing the image's specific URL; pixel/capture fallback paths when no eligible URL is available.
- JPEG submission through the Google Images file input, with preparation and results in the same new tab.
- New scripting, storage, and images.google.com permissions compared with 1.4.1; contextMenus becomes menus. There is no permanent access to all websites.
- No Android compatibility is declared.

The update does not require publishing the intermediate internal versions. Availability of the version number in the AMO listing and final validation must be checked before submission. The available historical comparison is against the local 1.4.1 files, not against a freshly downloaded signed XPI.
