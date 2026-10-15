# Sebams data and external requests

Sebams works locally by default. Dashboard state, task details, photos, backgrounds, notes and preferences are stored in the browser's IndexedDB database `sebams-v1`. Sebams adds no advertising, telemetry or analytics. Local storage is not encrypted by Sebams; anyone with access to the browser profile or a backup may be able to read it. Keep the installed extension folder and identity when updating to retain data.

## Optional ChatGPT plugin

Version 1.9 removes the integrated Gemini assistant and the local Bridge task polling. The optional Sebams plugin uses an authenticated Site at https://sebams-connect.poeticbadge1.chatgpt.site, authenticated with the user's ChatGPT account. Its MCP tools read and create tasks and edit their text, details, list, due date, priority or completion state. No model API or model API key is used by Sebams: the conversation happens in ChatGPT.

Only after **Settings → ChatGPT → Connect ChatGPT** and the connection-page sign-in, Sebams synchronizes task titles, details, profile names/colors, workspace/list names, dates, priorities and completion. This includes completed tasks. Reference photos, existing saved study answers, subtasks, exam plans, time tracking, dashboard notes, backgrounds and preferences are not sent through this connection. Reference photos may instead be downloaded and explicitly attached by the user in ChatGPT.

The Site stores task records separately by its authenticated, Site-scoped user identity. Sites handles authentication and access control. API and MCP task operations require identity; an extension checks that its paired identity matches before sending changes. Synchronization uses first-party sign-in cookies and optional host access, with no copied account cookies, stored passwords or API credentials. The exact Site origin and a private pairing nonce restrict web-to-extension messages. The nonce, synchronization baseline, account binding and conflict receipts are excluded from backups and delivered source/ZIPs.

Synchronization runs while the browser is open, approximately every minute and when entering or changing Sebams. ChatGPT sees the last synchronized copy; queries include its timestamp. Offline changes stay local until the connection is available. When direct authenticated requests are unavailable, a temporary connection page performs the first-party request and closes after completion. An expired session needs a user sign-in. Disconnecting stops synchronization and retains local tasks; it does not delete the previously synchronized private cloud copy. Conflicting edits are retained for the user to resolve rather than silently replacing one another.

The plugin requires installation and account connection in ChatGPT. Availability and platform action confirmations are controlled by ChatGPT. From version 1.10 the Site is available to other visitors without owner approval. Public access to the Site does not grant anonymous access to tasks: task pages require sign-in, and API/MCP operations use the authenticated Site-scoped identity. Other accounts cannot read or edit your task records. Publication in the public ChatGPT plugin directory is a separate OpenAI review process.

## Profiles and deleted content

Version 2.0 stores editable profile names/colors and a Recently deleted collection in the local state. Deleting a profile moves its full local contents there, pauses its task timers, and excludes it from active reminders and task synchronization. Its attachment bytes remain available for restoration and are included in backups. Deleting forever requires an explicit confirmation and removes only the local archived copy; previously downloaded backups and other devices are independent. Unreferenced attachment blobs are pruned after the existing cleanup grace period.

With ChatGPT connected, active profile metadata and task records synchronize by stable profile IDs. Profile deletion sends task/metadata tombstones for the active cloud copy. On another current client, receiving that deletion archives its own local profile contents. Conflicting profile deletion/edit choices preserve the complete local profile until the user decides. Recently deleted, local photos, links, notes and habits are not sent to ChatGPT. Older clients are asked to update before syncing accounts that have adopted the profile protocol.

## Suggestions

Settings → Suggestions keeps a draft in memory for the current Sebams tab. Continue in GitHub opens a prefilled GitHub issue containing only the title, description, chosen type and Sebams version. A GitHub account is required, and the user must review and submit the issue there. Submitted suggestions are public at https://github.com/sebasssz/sebams/issues, where the project team can read and reply. Opening a draft alone does not send a completed issue; the draft text is transmitted to GitHub in the navigation URL and may appear in browser history. Tasks, images and private connection details are never included automatically.

## Permissions and other destinations

| Feature | Permission / destination | Information shared |
|---|---|---|
| ChatGPT tasks, when connected | Optional host access to the exact Sebams Site; authenticated Site and MCP | Task metadata described above; sign-in session managed by Sites |
| Connect the extension | `externally_connectable` restricted to the exact Sebams Site | Task exchange only for the paired nonce and account |
| Install extension updates | Optional loopback host access; paired Bridge at 127.0.0.1:8787 | Local connection code and extension version |
| GitHub update source | Bridge requests api.github.com and approved GitHub asset servers | Release/download requests; no tasks, photos, API keys or pairing code |
| City lookup and weather, when enabled | Optional Open-Meteo geocoding / forecast host access | City name or saved coordinates; device coordinates only after Use my location |
| Online backgrounds, when enabled | Optional Lorem Picsum / Fastly host access | Photo IDs and image dimensions; no personal task data |
| Website icons, when enabled | Google favicon service / gstatic; Chrome's `favicon` permission | Website hostname and icon size, without path/query/fragment |
| Suggestions, after Continue in GitHub | GitHub issue draft/navigation | Only the typed suggestion, type and extension version; submitted issues are public |
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
