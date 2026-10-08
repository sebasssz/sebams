# Sebams data and external requests

Local update checks contact only the paired Sebams Bridge on this PC and send the extension version. The service reads a locally prepared release, verifies SHA-256 checksums and replaces only the configured extension folder. It keeps the previous code version in a sibling backup folder; personal browser data stays in Chrome. Daily checks are optional and installation requires clicking Install update. Update settings and the pairing code are stored separately and excluded from exported backups. The release and ZIP contain no API key or private Bridge configuration. There is no public update server or remote code download.

Sebams has no built-in account, telemetry, analytics, advertising or cloud sync. The optional AI connection uses the separate Sebams Bridge service. Your Gemini API key stays in that service's environment, outside the extension. Personal content is stored on this device in IndexedDB database `sebams-v1`: dashboard state, uploaded backgrounds, task photo blobs, a separate private connection code, and up to four cached online backgrounds. Storage is not encrypted by Sebams. Anyone with access to the browser profile or an exported backup may be able to read personal content. Removing the extension or clearing its site data can remove local data; export a backup first.

Task details and photos work without AI. Clicking **Ask AI** sends the selected task's title, details, priority, due date and list through the loopback Bridge to Google Gemini. Attached photos are included only when **Include reference photos in this AI request** is enabled. Photos can instead stay local as personal references with an enlarged viewer. Other tasks, notes and backgrounds are not included. The answer is saved locally with the task. Requests use `store: false`; this is not a promise of zero provider retention. Google's [pricing and data terms](https://ai.google.dev/gemini-api/docs/pricing) explain the free tier: submitted content may be used to improve its products. Use a Free Tier project without billing. A billed project may incur charges. Free quotas are limited; the Bridge does not switch to a paid provider. Inline requests are capped below 19 MB before sending.

The optional MCP connection lets ChatGPT create tasks. The Bridge shares workspace/list names to guide that conversation, receives task metadata from ChatGPT, and queues it locally until Chrome saves it. Chrome polls every minute while the Bridge is paired and running. The connection code authenticates requests to `http://127.0.0.1:8787`; it is stored separately and excluded from backups. The Bridge binds only to loopback. A ChatGPT connection requires a separate authenticated MCP transport setup described in the Bridge guide. No public server is deployed automatically.

The dashboard's clock, goals, tasks, notes, habits, settings, quotes, and bundled backgrounds work offline. The extension does not automatically inspect other tabs, browse history, read full page content, or modify websites. The new context-menu command receives only the selection text, selected link or current page URL/title when you explicitly choose Add to Sebams Tasks. It saves that reference to Inbox and opens it for review.

## Permissions

- **contextMenus** adds Add to Sebams Tasks to the right-click menu on HTTP/HTTPS pages, links and selections. There is no content script or broad page-access permission.
- Optional **notifications** is requested when enabling desktop task reminders. Local alarms schedule delivery while Chrome runs. Notification text includes the selected task title, list and due date; delivery markers prevent repeated reminders. Clicking a reminder opens the task.

- **alarms** schedules task reminders and focus-timer completion while Chrome runs, including when all Sebams tabs are closed.
- **alarms** also checks the paired local Bridge for pending tasks every minute. Disconnecting the Bridge stops this polling.
- Optional host access to `http://127.0.0.1/*` is requested only when pairing Sebams Bridge. The extension's content security policy restricts the connection to port 8787. This grants no access to other websites or browser content.
- **favicon** lets the dashboard retrieve the icon for a known shortcut URL from Chrome's favicon cache. Sebams does not list or search browsing history, request the `history` or `tabs` permissions, or inspect other pages. Chrome can show an added permission confirmation when updating from version 1.1.
- **geolocation** enables the optional **Use my location** feature. Chrome does not allow this capability in `optional_permissions`, so it must be declared at installation. Sebams calls the location API only when that button is clicked and does not watch location in the background. Manual city selection avoids using device location.
- Optional host access is limited to `https://geocoding-api.open-meteo.com/*` and `https://api.open-meteo.com/*`. Sebams asks when enabling weather and checks that access is granted before making a new request. A restored weather city does not bypass this check.
- Optional photo host access is limited to `https://picsum.photos/*` and its image CDN `https://fastly.picsum.photos/*`. Sebams asks when you enable the online collection or choose Random online background, and checks access before fetching metadata or a full-size background. Imported photo settings do not grant Chrome access. Photo thumbnails load only when the collection is enabled and access is available.

Chrome's [permissions documentation](https://developer.chrome.com/docs/extensions/reference/api/permissions) and [extension geolocation guidance](https://developer.chrome.com/docs/extensions/how-to/web-platform/geolocation) describe these platform constraints.

## External destinations

| Action | Destination | Data sent |
|---|---|---|
| Find a city | Open-Meteo geocoding API | Entered city name |
| Refresh enabled weather | Open-Meteo forecast API | Chosen city's coordinates, or device coordinates rounded to three decimal places after **Use my location** |
| Submit web search | Explicitly chosen Google, DuckDuckGo, or Bing | Search text in the provider's normal search URL |
| Open a shortcut, pinned link, or source link | The chosen website | Ordinary website navigation |
| Load an enabled online photo collection or background | Lorem Picsum / Fastly | Numeric photo ID and requested image size; no tasks, notes, name, or workspace content |
| Show a website icon in Links or the pinned dock with online icons enabled | Google's favicon service and gstatic image CDN | Website hostname and icon size; no path, query, fragment, or personal dashboard content |
| Pair/check the Bridge or receive MCP tasks | Local Sebams Bridge on 127.0.0.1:8787 | Connection code, workspace/list names, incoming task acknowledgements |
| Ask AI on a task | Local Bridge, then Google Gemini Interactions API | Only that task's title, details, priority, date, list and attached photos |
| Copy for ChatGPT | System clipboard | Prepared prompt and attachment filenames; photo bytes are not copied or uploaded |

Network services also receive normal network information such as the connection's IP address. Weather requests omit credentials and referrers. The latest successful reading is cached locally for 30 minutes; refreshes reuse the cache unless explicitly forced. A failed refresh retains the previous reading and labels its saved time. Turning weather off clears its saved city and reading and stops subsequent weather requests. Website permissions can also be revoked through Chrome's extension controls.

Full-size photo and metadata requests omit credentials and referrers. Photo thumbnails and website icon images suppress referrers; the browser controls normal image-request cookie behavior. Online website icons are enabled by default in Links and for pins and can be switched off in **Settings → Appearance → Online website icons**. Offline or unavailable icons use Chrome's saved icon or a neutral local globe. Disabling online icons stops subsequent requests to Google's icon service. Already-open requests may finish.

Photos use the public [Lorem Picsum API](https://picsum.photos/), without a key or account. Photographer credits link to each image's Unsplash source. Metadata is stored locally; refresh is explicit in the background panel. Cached image bytes are separate from personal uploads and backups. Turning off the online collection stops new photo requests while retaining its saved metadata and favorites. **Clear photo cache** removes downloaded backgrounds and turns off the collection. An uncached image while offline uses a bundled scene.

Weather comes from [Open-Meteo](https://open-meteo.com/) and is credited under [CC BY 4.0](https://open-meteo.com/en/terms). Its free API is for eligible non-commercial use; commercial distribution should use an appropriate Open-Meteo arrangement. Sebams does not contain credentials for a paid endpoint.

Backups include preferences, all workspaces, focus history, custom quotes, weather cache/location, timer state, and uploaded images. Import does not grant Chrome permissions. Backups are validated for schema, lengths, counts, website schemes, timer/location values, image types, sizes, signatures, and decoding before replacement.

Version 1.5 backups also include task details, AI answers, and referenced task photos (up to four per task, 8 MB each and 40 MB combined). The Bridge code, API key, and online background cache are excluded. Old backups still import. Removing a task photo removes that attachment; deleting a whole task offers a short undo window.

Version 1.2 upgrades the existing local data schema and database in place, retaining dates, pins, notes, uploads, and preferences from versions 1.0 and 1.1. Appearance controls and online photo metadata are included in backups. Version 1.2 did not send task reminders; version 1.6 adds optional local reminders as described above.

Version 1.6 backups also retain checklists, recurrence settings, reminder timestamps/delivery markers, estimates and elapsed time, completion dates, exam plans and templates. Importing a backup does not authorize notifications. Calendar views and study planning stay local and do not create external calendar events.

Version 1.8 opening reminders are computed from local task dates and preferences. Dismissal/snooze receipts are stored in a separate private IndexedDB record, excluded from backups. Atomic claims suppress simultaneous displays in other tabs, with a five-minute recovery lease if a tab closes unexpectedly. No network or notification permission is required for this UI. Specific per-task reminder times override the opening schedule.

When a GitHub repository is explicitly configured, Sebams Bridge requests the latest public release from api.github.com and downloads sebams-update.json from github.com and approved GitHub asset servers. GitHub receives the Bridge computer’s network metadata and release/download requests. Tasks, personal photos, API keys and pairing codes are not sent to GitHub. File hashes and compatible extension metadata are checked before installation. The extension continues to access only its authenticated local Bridge for updates. Repository choices and installation paths stay in private Bridge configuration and are excluded from delivered ZIPs; each computer keeps independent data.
