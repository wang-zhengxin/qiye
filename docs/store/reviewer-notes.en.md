# Qiye Reviewer Instructions

Version 1.5.2 · Free · Desktop browsers · No Qiye account required

Contact: wangzhengxin007@gmail.com

## Package and validation scope

Use the Chromium ZIP for Chrome / Edge and the dedicated Firefox ZIP for Firefox. Each package has manifest.json directly at its root. The current Firefox Release ZIP is unsigned; normal distribution requires Mozilla signing.

Existing tests use simulated extension APIs and business-logic checks. Screenshots show the actual application running with sample data in isolated preview contexts; they do not establish native extension installation or compatibility in every target browser. Test the submitted extension package using the steps below.

## Core test steps

1. Install in a separate test browser profile. Click the extension icon or use Alt + Shift + T to open the workspace.
2. Open sample pages in two or more windows. Choose Open tabs → All windows. Tabs are organized by window, with each tab appearing once in the main list. Switch to Current window to check scope.
3. Select two tabs and create a native group. Join an existing group by dragging, or ungroup it. Saved but closed toolbar groups cannot be fully read; open them before testing group management.
4. Activate one tab and put a different background tab to sleep. Its tab-bar entry remains and activating it reloads the page. Active tabs are protected. Some special pages may be restricted by the browser.
5. Save selected tabs as a session. Close the original tabs and restore the saved session. Saving retains the source tabs by default; when close-after-save is enabled, saved content is written before tabs are closed.
6. Lock a saved session and check edit/move protection. Unlock to continue. Try starring, cloning, deduplication, sorting and reopening a session.
7. Create a test native bookmark folder and bookmark, rename them and move them. Drag a link into a folder to bookmark it. Drag a saved session into a folder to create or reuse a named child folder while retaining the original session. Built-in and managed folders are protected.
8. Delete an item through Qiye and restore it from the recycle bin. Bookmarks deleted outside Qiye are not included in this recovery flow.
9. Create a snapshot. Export collections as JSON and import them again: existing content should remain and imported content should be added. Preferences have separate import/export tools.
10. Change the language or appearance, save preferences, and reopen the workspace. The optional start page is disabled by default and does not replace the browser's new tab page unless configured.

## Optional remote sync

Core features work without remote services. Defaults are syncProvider=none and autoSync=false. There is no Qiye server account or mandatory login.

To test sync, use a dedicated HTTPS WebDAV file URL or your own test GitHub token with access to a Secret Gist. Do not use real private browsing collections. Long-lived developer credentials are not embedded in the package. If a certification process requires a dedicated test service, provide revocable credentials through that platform's private review fields.

1. Configure the service and credentials, save, and grant access to that service origin. Firefox additionally requests optional data-transmission consent.
2. Test the connection, then perform a real manual sync. A read-only connection test does not prove write access. Manual sync must create or update a remote file. An empty Gist ID is populated after a successful first creation.
3. Change a test session and sync again to check merging. Replacing local collections by pulling remote data first creates a local recovery snapshot.
4. Deny host access or revoke Firefox data-transmission consent: requests should stop and local collections should remain. Check invalid credentials, unreachable servers and offline errors.
5. Remove saved credentials: automatic sync is disabled. Remote files remain and must be deleted at the provider separately.

## Permissions and code

See generated/permissions.md for the purpose of each permission. There is no history permission, scripting permission, or content script. Executable scripts and styles are packaged locally; remote sync only parses validated JSON. Extension runtime code has no third-party dependencies.

Sync transmits saved link titles and URLs and uses credentials for provider authentication. Native bookmark trees are excluded from remote collection JSON. Remote sync accepts HTTPS only; plaintext endpoints are rejected before sending requests or credentials, and redirects are rejected. Qiye does not implement end-to-end encryption or application-level credential encryption. Firefox sync requests only the relevant optional data categories, with technicalAndInteraction required only when syncing preferences. The optional start page separately requests searchTerms when submitting a query; declining blocks that search. Final AMO validation and signing remain platform steps.

## Reproduce the Firefox package from source

Use Node.js 20.11+; Node.js 24 matches CI. No npm install is required.

```bash
node scripts/package.mjs --target=firefox
```

The output is artifacts/qiye-workspace-firefox-v1.5.2.zip and the unpacked directory is dist-firefox/. The build copies local files, emits a browser-specific manifest, and compresses the package. It does not obfuscate executable code or fetch remote code.
