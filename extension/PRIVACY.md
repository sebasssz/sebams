# Sebams data and external requests

Sebams works locally by default. Dashboard state, task details, photos, backgrounds, notes and preferences are stored in the browser's IndexedDB database `sebams-v1`. Sebams adds no advertising, telemetry or analytics. Local storage is not encrypted by Sebams; anyone with access to the browser profile or a backup may be able to read it. Keep the installed extension folder and identity when updating to retain data.

## Optional ChatGPT plugin

Version 1.9 removes the integrated Gemini assistant and the local Bridge task polling. The optional Sebams plugin uses a private Site at https://sebams-connect.poeticbadge1.chatgpt.site, authenticated with the user's ChatGPT account. Its MCP tools read and create tasks and edit their text, details, list, due date, priority or completion state. No model API or model API key is used by Sebams: the conversation happens in ChatGPT.

Only after **Settings → ChatGPT → Connect ChatGPT** and the connection-page sign-in, Sebams synchronizes task titles, details, workspace/list names, dates, priorities and completion. This includes completed tasks. Reference photos, existing saved study answers, subtasks, exam plans, time tracking, dashboard notes, backgrounds and preferences are not sent through this connection. Reference photos may instead be downloaded and explicitly attached by the user in ChatGPT.

The private Site stores task records separately by its authenticated, Site-scoped user identity. Sites handles authentication and access control. API and MCP task operations require identity; an extension checks that its paired identity matches before sending changes. Synchronization uses first-party sign-in cookies and optional host access, with no copied account cookies, stored passwords or API credentials. The exact Site origin and a private pairing nonce restrict web-to-extension messages. The nonce, synchronization baseline, account binding and conflict receipts are excluded from backups and delivered source/ZIPs.

Synchronization runs while the browser is open, approximately every minute and when entering or changing Sebams. ChatGPT sees the last synchronized copy; queries include its timestamp. Offline changes stay local until the connection is available. When direct authenticated requests are unavailable, a temporary connection page performs the first-party request and closes after completion. An expired session needs a user sign-in. Disconnecting stops synchronization and retains local tasks; it does not delete the previously synchronized private cloud copy. Conflicting edits are retained for the user to resolve rather than silently replacing one another.

The plugin requires installation and account connection in ChatGPT. Availability and platform action confirmations are controlled by ChatGPT. The private Site is owner-only; publishing its source code on GitHub does not make task records public.

## Permissions and other destinations

| Feature | Permission / destination | Information shared |
|---|---|---|
| ChatGPT tasks, when connected | Optional host access to the exact Sebams Site; authenticated private Site and MCP | Task metadata described above; sign-in session managed by Sites |
| Connect the extension | `externally_connectable` restricted to the exact Sebams Site | Task exchange only for the paired nonce and account |
| Install extension updates | Optional loopback host access; paired Bridge at 127.0.0.1:8787 | Local connection code and extension version |
| GitHub update source | Bridge requests api.github.com and approved GitHub asset servers | Release/download requests; no tasks, photos, API keys or pairing code |
| City lookup and weather, when enabled | Optional Open-Meteo geocoding / forecast host access | City name or saved coordinates; device coordinates only after Use my location |
| Online backgrounds, when enabled | Optional Lorem Picsum / Fastly host access | Photo IDs and image dimensions; no personal task data |
| Website icons, when enabled | Google favicon service / gstatic; Chrome's `favicon` permission | Website hostname and icon size, without path/query/fragment |
| Web search / opening a link | User-selected provider or website | Search text or normal navigation |
| Copy for ChatGPT | System clipboard | Task prompt and photo filenames; no photo bytes |
| Add to Sebams Tasks | `contextMenus` | Only the selected text, selected link or current page URL/title when explicitly selected; stored locally and synchronized if ChatGPT is connected |
| Optional desktop reminders | Optional `notifications` and `alarms` | Local Windows/Chrome notification contains task title, list and due date |

The extension does not inspect other pages, enumerate browsing history or read full page content. Host permissions are requested when enabling the corresponding feature. Chrome controls consent and revocation. `geolocation` must be declared at installation but is called only after **Use my location**; manual city selection avoids it. Local alarms also schedule timer completion and optional update checks.

Network providers receive normal network metadata such as IP address. Weather and photo requests omit credentials and referrers. Online icons can be disabled under Appearance. Turning off weather clears its saved location/reading; turning off online backgrounds stops new requests while retaining saved choices, and Clear photo cache removes cached downloaded scenes. Photos are credited through the public [Lorem Picsum](https://picsum.photos/) collection. Weather is credited to [Open-Meteo](https://open-meteo.com/) under its applicable terms.

## Updates, backups and reminders

Bridge is retained only as the optional installer for the unpacked extension. It verifies file hashes and the compatible manifest, replaces only the explicitly configured folder, and keeps the old code in a sibling backup. Browser data remains in the browser profile. Its private API key, connection code and machine-local installation paths are excluded from distributed files.

Backups contain preferences, workspaces/tasks and their local extras, notes, focus history, quotes, timer, weather cache/location, personal images and task photos. They exclude connection configuration, synchronization receipts, online photo cache and reminder dismissal/snooze receipts. Importing a backup does not grant host or notification permissions. If ChatGPT is already connected, restored task changes are treated as local edits at the next synchronization; review changes or disconnect before restoring if you want the restore to remain local.

Opening reminders are computed locally from task dates and settings. Atomic private receipts suppress duplicate popups across tabs and recover an interrupted claim after five minutes. No network or desktop notification permission is required for opening reminders.
