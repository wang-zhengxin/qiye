# Qiye for Microsoft Edge Privacy Policy

Effective date: 2026-10-19 · Product version reviewed: 1.5.0

Operator: The individual developer of Qiye. Contact: wangzhengxin007@gmail.com.

## What Qiye does

Qiye is a free desktop browser extension for organizing tabs, native tab groups, saved sessions, and bookmarks. Core functionality requires no Qiye account. This policy describes Qiye's extension code; browser-store, browser-vendor, hosting-provider, and external website practices are governed by those providers.

## Information used locally

Qiye accesses tab titles, URLs, window and group identifiers, grouping information, and tab status to display and manage open pages. It accesses bookmark names, URLs, folder relationships, and identifiers to provide bookmark management. A local workspace cache may include bookmark information. Saved sessions, stashed links, favorites and locks, preferences and preference history, snapshots, items in the recycle bin, sync status, and links opened through Qiye are stored in the browser profile. If you enable startup restoration, Qiye stores a local snapshot of eligible previously open pages. Qiye does not use the browser history API to obtain a complete browsing history and does not inject scripts to read website content, form fields, or keystrokes on websites.

## Optional external connections

Remote sync is disabled by default. If you choose and configure WebDAV or GitHub Gist, Qiye sends saved-session names, link titles and URLs, stashed links, associated identifiers and timestamps, and optionally portable preferences to the service you select. Native bookmark trees, recent-link records, recycle-bin records, and local snapshots are not part of the remote sync payload. Links you explicitly copy or import into saved sessions can be included as saved-session links. Connection settings and credentials are excluded from synced preference data.

WebDAV credentials are sent to your configured server for authentication; a GitHub token is sent to GitHub's API for authentication. These credentials are not included in exported collections or remote collection JSON. A provider receives normal connection information such as your IP address and request metadata. GitHub connection tests can request your account information to validate authentication. Qiye does not send these collections to a developer-operated sync server.

If you choose the optional start page and submit a search, your query is sent by navigation to the search engine you select. Opening saved links takes you to those websites, which apply their own policies. The extension code contains no advertising, analytics SDK, tracking beacon, or third-party favicon request. The developer does not sell browsing data or use it for targeted advertising.

## Security and storage limitations

Use HTTPS for remote sync. Version 1.5.0 also accepts HTTP WebDAV addresses; HTTP does not encrypt connection content or authentication information. Do not use it for public-network transfers. Secret Gists are unlisted, not private encrypted vaults: anyone who obtains their URL may be able to read them. Qiye does not implement end-to-end encryption.

Extension credentials are stored separately in browser-local extension storage. Qiye does not encrypt them with an additional application encryption key or store them in the operating system's keychain. Protect your browser profile and device and use narrowly scoped, revocable credentials. Collection exports are ordinary readable JSON files, not encrypted backups.

## Your controls and deletion

You can use the extension locally without configuring sync. Disable automatic sync, select local-only mode, revoke site access or applicable optional data-transmission permissions, or use **Remove saved credentials** in sync settings. Removing credentials also disables automatic sync; it does not delete remote files. You can revoke provider credentials from the provider's account settings.

Delete saved items and empty the recycle bin, remove snapshots, and clear Recently opened through the corresponding views. Resetting preferences alone does not erase collections or credentials. To remove the extension's complete local storage, remove the extension or clear its storage using browser tools. Native bookmarks belong to the browser and are not erased by uninstalling Qiye. Remote WebDAV/Gist copies and files you exported must be deleted separately at their storage locations. Qiye cannot retrieve device-only collections or delete copies held by a provider on your behalf.

## Retention, support, and changes

Local items remain until deleted, replaced, or removed with extension storage; some local histories and snapshots have implementation limits. Remote copies follow the chosen provider's retention and deletion behavior. If you email support, your email address and the information you send are used to respond; do not send credentials or sensitive browsing data. This product is operated by an individual developer. Future material changes will be reflected in an updated policy date and extension documentation.

Questions or data-handling requests: wangzhengxin007@gmail.com.
