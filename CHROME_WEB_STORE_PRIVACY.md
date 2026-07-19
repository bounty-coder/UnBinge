# Chrome Web Store Privacy Practices

Use this as the source text for the Chrome Web Store Developer Dashboard
Privacy practices tab after rebuilding and uploading the `dist` package.

## Single Purpose Description

Unbinge creates a distraction-free YouTube learning environment by allowing only approved educational channels and videos, hiding distracting YouTube UI elements, and letting parents locally approve or request review of educational channels.

## Permission Justifications

### alarms

Unbinge uses alarms to periodically sync the approved educational channel whitelist in the background. This keeps the local whitelist current without requiring the user to open the popup.

### storage

Unbinge uses local extension storage to save user settings, the selected age category, distraction filter preferences, locally approved channels, cached public channel metadata, and the synced educational whitelist.

### tabs

Unbinge uses tabs only for YouTube pages: to redirect blocked YouTube pages to the extension's local blocked page and to notify open YouTube tabs when filtering settings change.

### webNavigation

Unbinge uses webNavigation to detect top-level YouTube navigation, including YouTube single-page navigation, so non-approved videos or channels can be blocked before they remain visible.

### host permission use

Unbinge requests host access only for YouTube, the YouTube Data API, and unbinge.watch. YouTube access is required to inspect the current YouTube page and resolve public video/channel metadata for whitelist enforcement. Google API access is used to fetch public YouTube channel metadata. unbinge.watch access is used to sync the approved channel whitelist and submit channel review requests.

## Removed Permissions

These permissions were removed from the manifest because the v1 ad-blocking/DNR feature is disabled:

- declarativeNetRequest
- declarativeNetRequestWithHostAccess

If the Chrome Web Store still asks for DNR justifications, rebuild the extension and upload the new `dist` ZIP. The old uploaded package still contains those permissions.

## Remote Code Use

Recommended dashboard answer: No, this extension does not use remote hosted code.

Justification if a text field is shown:

All JavaScript executed by Unbinge is bundled inside the extension package. The extension performs remote HTTPS requests only to retrieve data, such as approved channel lists and public YouTube video/channel metadata. Remote responses are not executed as JavaScript or WebAssembly, and the extension does not use eval, new Function, or remote script tags.

## Data Usage Certification

You can certify compliance if the Chrome Web Store data disclosures match the behavior described in `website/privacy.html`:

- Extension settings and whitelists are stored locally.
- Channel review requests may send channel URL, ID, handle, and name to unbinge.watch.
- Whitelist sync sends selected age category to unbinge.watch.
- YouTube/Google lookups may include the current YouTube video ID or channel handle to retrieve public metadata.
- Data is used only for the extension's single purpose and is not sold or used for advertising.
