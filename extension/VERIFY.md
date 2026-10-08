# Sebams 1.8.0: verification

On October 8, 2026, **70 extension unit checks**, **32 Bridge checks** and **45 focused Chrome scenarios** passed on Chrome 154 with isolated profiles. The browser reports are reminders.json (13), product.json (18) and updates.json (14). Earlier reports below are historical.

The opening-reminder suite verifies persisted custom timing and toggles, a preview that does not consume real reminders, dismiss and snooze across reload, new schedules after date changes, explicit-time precedence, exclusion of completed tasks, opening the correct workspace with attached photos, recurrence completion, direct-link suppression, atomic cross-tab claims and recovery leases, privacy in backups, Escape dismissal, dark backdrops and small-screen layout. Eight new pure checks cover scheduling, receipt selection, bounded batches and schema 5 migration preserving existing task tools.

The GitHub tests use deterministic API/asset fixtures, including two independent installation folders receiving the same release, previous-version backups, file hashes, traversal and malformed-data rejection, changed-release rejection, repository and redirect restrictions, missing releases and rate limits, authenticated source settings and preservation of machine-specific folders. These original checks used fixtures. Publishing and live download validation are recorded separately when performed. The produced sebams-update.json was also validated end-to-end against the actual payload using a fixture source. The Windows setup helper passed with explicit folder/repository parameters under Windows PowerShell; its visible folder picker remains a manual check.

The update browser suite additionally verifies shared-source settings and atomic preference writes so concurrent version checks cannot overwrite the automatic-check toggle. It performs a real physical extension-folder replacement and Chrome runtime reload, retains extension identity, task drafts and the hash of an attached reference photo, restores the current tab and confirms the updated version. The task-tools suite checks the existing checklist, recurrence, calendar, capture, templates, exam planner, time tracking, progress, notification scheduling, reference-photo viewer and responsive layouts. Local access/notification consent is simulated in the headless tests.

## Historical verification

# Sebams 1.7.0: verification

On October 7, 2026, **62 extension unit checks**, **24 Bridge checks** and **82 Chrome browser scenarios** passed with isolated profiles on Chrome 154. Reports are in tests/results. Earlier reports below are historical.

The new update suite exercises direct Links deletion and Undo, native HTML drag in Links and dashboard pins, keyboard ordering, workspace isolation, removal of the Tasks footer, dark backdrops without blur, the real authenticated local update endpoint, daily alarm scheduling without postponing it during synchronization, disabling checks, excluding private settings from backups, rejecting a changed release, saving a pending task-details draft, physical folder replacement with a previous-version backup, actual runtime reload and automatic tab restoration, preserving extension identity, preserving tasks/settings and the SHA-256 of an attached photo, current-version status and narrow layout.

The update uses a locally prepared release; no public release server or Web Store update is claimed. Pairing/optional local-host permission is simulated in the isolated test profile. Chrome alarms, runtime reload, tabs, IndexedDB, HTTP authentication, SHA-256 checks and physical installation run for real. Developer mode is enabled in the test profile, matching an unpacked installation. Other browser suites use repeatable weather/photograph/AI fixtures; no live Gemini generation or billing changes were made.

Backend tests cover numerical version comparisons, integrity and unsafe-path rejection, stale release/downgrade refusal, parallel-install refusal, successful replacement/backup, rollback on a failed replacement and authenticated endpoints. The installer reads private local folder configuration and accepts no destination path from browser requests. [Chrome runtime API](https://developer.chrome.com/docs/extensions/reference/api/runtime).

## Earlier verification

# Sebams 1.6.0: verification

On October 7, 2026, **60 extension unit checks**, **17 Bridge checks**, and **78 browser scenarios** passed on installed Chrome 154 using isolated profiles, with no uncaught page errors. Browser suites: main 15, controls 7, upgrade 7, tasks 9, photos 8, compact Links 6, AI 8, new product tools 18. Reports are in tests/results. Previous-version reports below are historical.

New tests cover schema 4 migration preserving photos/answers, daily/weekly/month-end recurrence, completion undo without duplicate successors, checklist independence, one active time tracker, exam distribution, templates and subject rename/delete/undo, weekly completion history, capture via the actual save handler, keyboard command search, enlarged references, explicit AI photo sharing, native Chrome alarm scheduling, reminder delivery markers and failure backoff, pin appearance/removal/undo, backup round trips, and 320px–1440px layouts.

Notification permission and delivery are simulated in headless Chrome; the actual alarms API and worker/storage transactions run. Windows notification presentation and its native permission prompt require manual verification. Capture saving uses the production handler; the native right-click menu entry is checked through Chrome contextMenus, without automatically reading a live third-party page. AI/photograph responses are fixtures for repeatable browser tests. No live Gemini generation or billing changes were made in this verification.

The installed Bridge guidance code was updated and restarted, preserving its existing private configuration. Its health endpoint reports configured; that status does not prove provider generation succeeds. The service never falls back to a different paid provider. Official API references: [Chrome notifications](https://developer.chrome.com/docs/extensions/reference/api/notifications), [contextMenus](https://developer.chrome.com/docs/extensions/reference/api/contextMenus), and [alarms](https://developer.chrome.com/docs/extensions/reference/api/alarms).

## Earlier verification

# Sebams 1.5.1: Gemini verification

Version 1.5.1 switches the task assistant to Google Gemini 3.8 Flash using its documented free-tier Interactions API. Fresh verification passed **47 extension unit checks**, **16 Bridge checks**, and **12 Chrome scenarios** (AI 8, real local Bridge 4), all without uncaught page errors. Other dashboard reports below retain the version 1.5 baseline.

The Gemini checks cover selected exercise/image bytes, private header-based API authentication, store:false, completed output extraction excluding thoughts, cancellation, sanitized provider failures, quota exhaustion with no alternate-provider fallback, oversized inline requests rejected before upload, API-key rejection in the Chrome connection-code field, photo backup/Undo, conflicts and MCP import while dashboard tabs are closed. The backend uses no OpenAI API endpoint.

**No live Gemini generation or billing setup was performed.** The user must create a Free Tier Google AI Studio key and keep billing disabled. Test responses are simulated. Free-tier availability and quota depend on the project; Google may use free-tier content to improve products. The photo UI still permits four 8 MB attachments, but complete inline AI requests are capped below 19 MB.

## Version 1.5 baseline

The extension was loaded and exercised in the installed **Google Chrome 154.0.8037.93 on Windows**, using isolated test profiles. The actual Manifest V3 extension and `chrome://newtab` override were tested. The user's normal Chrome profile was not changed.

Version 1.5 passed **47 extension unit checks**, **69 fresh Chrome scenarios**, and **13 local Bridge checks**. Chrome suites: main (15), controls (7), upgrade (7), tasks (9), extended (5), photos (8), compact Links (6), AI (8), and actual Bridge integration (4). Every browser suite reported **no uncaught page errors**. The extension upgrades to state schema 4, database version 3 and backup version 2; older data and backups still work. Loopback access is optional and requested when pairing the Bridge.

New checks cover task details, persistent photos, selected-task vision payloads, plain-text answers, cancellation, failed-provider recovery, conflict protection, photos/answers in backups, deleted-task Undo, photo cleanup, strict batch validation and receipt deduplication even after deletion. The actual local HTTP service was connected to Chrome and the official MCP SDK client. A Chrome alarm imported and acknowledged a queued MCP task with every Sebams tab closed, before opening any dashboard again. The SDK also initialized HTTP and stdio MCP, checked missing-data questions, form accept/decline, authentication, idempotency, queue persistence and authenticated shutdown. Windows Start/Stop helpers were exercised in an isolated folder.

OpenAI responses in all AI tests are explicit offline fixtures. **No live OpenAI API request, paid generation, Secure MCP Tunnel or connection to the user's ChatGPT account was performed.** The user does not have an API key yet. Native Chrome permission consent is simulated only in headless tests; the production code requests it normally. The current photo run uses eight controlled scenarios; the live photo checks below are historical release evidence.

The new checks covered direct link navigation, real icon URLs, adding a link, preserving an unsaved draft when opening options, managing/editing/removing/undoing links, pins, workspace separation, keyboard focus, and forty-link scrolling at four viewports from 320×568 to 1440×900. Random-photo controls were tested with explicit permission/transport fixtures: denial sends no API requests, successive choices differ, selected photos persist and reload offline, and failed downloads preserve the preceding selection. The production photo module also queried the real Picsum service, downloaded its actual JPEG, and displayed it in Chrome. Actual Google website icons decoded successfully. Desktop/mobile Links and Settings previews were inspected.

The version 1.2 baseline passed five browser suites with **43 scenarios** and **37 unit checks**. The task workspace checks and regression runs for version 1.3 are recorded below. Playwright 1.62.1 is used only for development verification. The delivered dashboard has no production dependencies or build step.

Version 1.3 passed **38 unit checks**, including date-independent Completed filtering, and **35 fresh browser scenarios**: main (15), controls (7), upgrade (7), and the new task workspace (8). All four browser runs reported **no uncaught page errors**. The storage schema, backup format, and extension permissions are unchanged. Extended and live-photo checks retain their version 1.2 reports; they were not repeated for this task UI change.

The new task suite verified subject navigation, pending and completed counts, creating a list, moving tasks between subjects, date filters, completion, delete/undo, persistence, workspace separation, and keyboard operation. A list literally named All remains distinct from the All tasks view. Layout checks included a 40-character list name, a long task, six viewports from 320×568 to 1920×1080, and actual 200% Chrome zoom. The composer stayed inside the dialog, and the selected subject stayed visible when changing filters in narrow-screen navigation. Desktop and mobile captures were visually inspected.

Version 1.3.1 reran the task suite with **9 passing scenarios and no uncaught page errors**. Its new scenario checked duplicate-name rejection, renaming every task reference, deleting without losing task text, dates, priority, or completion, Inbox protection, and undo restoring the list and its tasks. The responsive checks also passed with the new list actions; long headings use at most two visible lines on narrow screens. The fresh task report replaces the preceding eight-scenario report. Other browser reports and the 38-unit report retain the version 1.3 baseline.

## Browser checks that passed

| Area | Verified behavior |
|---|---|
| Installation | Chrome loaded the actual unpacked MV3 extension, its worker, and its new-tab override. |
| Onboarding and clock | Optional name entry, skippable onboarding, personalized greeting, 12/24-hour controls, and hiding the date. |
| Daily focus | Enter, edit, complete, mark unfinished, preserve across day changes, keep for today, and archive. |
| Daily content | An already-open tab rotates scenery and quotes on a new local day even while a previous goal remains pending. |
| Tasks | Add, edit, complete, priority changes, new lists, list filtering, cancel edit, delete/undo, and reorder within a filtered list with hidden tasks between items. |
| Links and search | Add, rename, folders, reorder within a folder, remove/undo, cancel edit, shortcut navigation, provider selection, and encoded search navigation. Test destinations were intercepted to avoid third-party browsing. |
| Appearance and quotes | Scene selection, favorites, favorite rotation, dimming, quote selection/favorites, custom quotes, delete/undo, and visibility controls. |
| Uploaded images | Real JPG decoding, local blob wallpaper rendering, export including image bytes, removal, and restoration. |
| Notes and workspaces | Autosave, save now, separate notes per workspace, multiple-tab conflict detection, retaining the unsaved draft, and downloading the latest edited draft before reviewing the saved note. |
| Multiple tabs | Simultaneous changes to different collections survive; another open tab receives the updates. |
| Habits | Add, check/uncheck, persistence, removal, and undo. |
| Focus timer | Custom work/break lengths, start, pause/resume, reset, switch, sound preference, focus view, deadline recovery after reload, and expired state after browser restart. |
| Closed-tab timer | A running timer imported through the backup UI schedules an alarm. With all dashboard tabs closed, the worker completed it; persisted data was inspected before reopening a dashboard. |
| Backups | Export/import round trip, uploaded image restoration, immediate undo, refusal to undo over newer changes, invalid backup rejection, and actual file-download delivery. |
| Weather | Cached reading and its update time, access-denied refresh, Celsius/Fahrenheit conversion, city selection, refresh, turning weather off, and location-failure messages. City/location UI paths used clearly labeled test fixtures. |
| Offline and safety | Bundled scenery and local editing work with network access disabled. Executable URL schemes are rejected, and HTML-shaped user text remains plain text. |
| Keyboard and layout | Enter opens a panel, Tab remains inside its modal, Escape closes and returns focus. Reordering and deleting retain focus inside the panel; choosing a quote retains the corresponding control. The daily-focus completion target measures 40×40 pixels. No horizontal overflow or dashboard/footer overlap at 1920×1080, 1366×768, 1024×640, or 375×812. Tool panels fit each viewport. Settings remained usable at actual 200% browser zoom. |
| Restart | The browser process was closed and relaunched with the same isolated profile; saved notes, tasks, and timer state remained. |
| Upgrade and compatibility | Actual version 1 data in the existing IndexedDB database upgraded after reload, retaining notes, tasks, focus, preferences, and prior visibility values. Older backups still import and support undo. |
| Task dates | Add, edit, clear, today/upcoming/overdue/undated views, complete, and delete/undo retaining dates. Concurrent date edits are detected before an older form can overwrite them. |
| Visibility switches | Separate switches for notes, timer, habits, main daily focus, background selector, and background favorite button. They persist independently in Personal and Work; hidden content stays stored. |
| Pinned links | Pin during creation, pin/unpin existing links, one-click navigation, rename, remove/undo, reload persistence, and backup restoration. Eight pins were checked at all four viewport sizes. |
| Glass appearance | Neutral panel color and translucent alpha were checked in Chrome. Dashboard, task, and settings screenshots were visually inspected. |
| Version 1.1 upgrade | Actual version 2 state in a version 1 IndexedDB database was seeded before opening the new dashboard. State and database migration preserved dates, pins, notes, and uploaded image bytes. |
| Online photo controls | Disabled and denied access made no photo requests. Controlled permission/transport fixtures checked enable, collection loading, favorites, next-scene navigation, and clear-cache behavior. |
| Rotation and offline photos | Hourly and daily changes occurred in an already-open tab. A tab's random selection remained stable while editing unrelated data. Four-image cache bounds, offline reload of a cached scene, and bundled fallback for an uncached scene passed. |
| Vertical pins and real icons | Eight pins formed one vertical column at all four viewports without overlapping central content. One click opened the chosen destination. Real Roblox and YouTube favicon images decoded in Chrome. Icon-only mode retained accessible names; disabling online icons used Chrome's favicon URL. |
| Appearance controls | Panel opacity, panel blur, background blur, and clock size previewed, saved, and survived reload. Reset restored the defaults. |
| Photo backups | Metadata, selected photo, favorites, and appearance survive backups. Cached online JPEG bytes remain separate from uploaded images and are excluded from the backup. |

Separately, the production weather module successfully queried the real Open-Meteo city and forecast endpoints for Berlin. Failed-response and malformed-response checks use mocks; no weather fixture is bundled as a live reading. The logo, all three wallpapers, and a real dashboard screenshot were visually inspected.

The production photo module queried the real Picsum endpoints for the twelve selected photo IDs and downloaded the real 1920×1080 Mountain waters JPEG. Chrome decoded that JPEG through the normal photo cache and displayed its real photographer/source credit. Live photo thumbnails and website icons were also exercised. The real endpoint calls ran through Node; controlled browser permission responses were used because headless Chrome cannot present its native host-access consent dialog. No test fixture or permission override is part of runtime extension code. The final previews use the real photograph rather than a simulated API image.

## Initial-release independent review

Independent agents reviewed storage transactions and timer/weather logic. Their review confirmed that read/modify/write transactions serialize across tabs, image metadata and blobs commit together, backups use a consistent snapshot, weather requests check optional host access, and timer recovery uses persisted deadlines. Findings led to stricter backup image/date/timer validation, worker-start alarm recovery, and avoiding revision changes during read initialization.

A separate design review found the screenshot calm and readable, with the requested visual hierarchy. Its accessibility findings led to a larger daily-focus completion target and retaining keyboard focus during panel updates. Those changes were then checked in the real extension.

## Reproduce

From the extension folder, the dependency-free unit checks run with:

```sh
npm test
```

If the environment prevents test-runner child processes, use:

```sh
node --test --test-isolation=none tests/*.test.mjs
```

Browser QA requires Node 24, the development-only Playwright package, and a current Chrome supporting extension debugging:

```sh
npm install
npm run test:browser
npm run test:extended
npm run test:controls
npm run test:upgrade
npm run test:photos
npm run test:tasks
npm run test:links
npm run test:ai
npm run test:bridge
```

On Windows, scripts default to Chrome in `C:/Program Files/Google/Chrome/Application/chrome.exe`. Set `CHROME_PATH` if it is elsewhere. On other platforms they use Playwright's Chromium unless `CHROME_PATH` is set; those platforms were not verified here. `SEBAMS_PLAYWRIGHT_PACKAGE` can point to an existing Playwright ES module instead of installing it. `SEBAMS_QA_DIR` can select a scratch output directory.

Set `SEBAMS_LIVE_PHOTOS=1` for the ninth photo scenario, which contacts the actual public service and saves previews. Without it, `test:photos` runs eight controlled scenarios and avoids depending on that service's availability. Version 1.5's delivered photo report contains eight controlled scenarios. `test:bridge` needs the neighboring Sebams-Bridge folder with its SDK dependencies installed; it uses port 8787, an isolated data directory and a simulated OpenAI response. Stop any running Bridge before that test.

The scripts create separate profiles and use `--enable-unsafe-extension-debugging` solely to load the unpacked test extension in those profiles. Reports, test backups, and profiles go to `work/qa` by default and are excluded from the delivered ZIP. The passed browser reports are in `tests/results`.

## Remaining manual checks

- A live Gemini response with the user's own free API key and selected model, including provider billing and account access. The API request format and image bytes were verified with a fake provider.
- Installing/configuring the official Secure MCP Tunnel and connecting the tools to the user's ChatGPT account. Only local MCP transports and elicitation were tested.
- The native Chrome consent dialog for local Bridge access. Headless tests checked permission grant/denial logic using fixtures.

- Installation using the user's visible **Load unpacked** picker and Chrome's optional **Keep it** confirmation. Automated installation and the new-tab override passed in isolated profiles.
- Real operating-system location consent and location accuracy. The denial/recovery UI and permission gates were tested; device location was not requested.
- The native Chrome photo-access consent dialog and any new favicon-permission confirmation during a user's in-place update. Permission denial/grant logic and request gates were checked with explicit fixtures.
- The audible chime on the user's speakers and Chrome's sound-autoplay behavior. Timer state, sound preference, and completion were verified.
- A full screen-reader session and a formal accessibility/contrast audit. Keyboard behavior, labels, reduced-motion styles, responsive layouts, and zoom were checked; these do not replace assistive-technology testing.
- Chrome 120 itself, other operating systems, and Chrome Web Store review. Version 120 is the declared minimum; the executed browser checks used Chrome 154.
- Exhausted disk/quota behavior was reviewed in error handling, not induced on the user's device.

The in-app browser initially displayed a local preview, but a later attempt to reopen that URL was blocked by its URL policy. No workaround was attempted. The included dashboard screenshot comes from the separate, successfully tested Chrome extension.
