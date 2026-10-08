# Sebams

Version **1.8.0** adds opening task reminders with configurable anticipation and time, preview, snooze and task actions, plus a shared GitHub Releases update source for other PCs. See the Spanish [1.8 guide](GUIA-1.8.md). Existing schema 5 data migrates to schema 6 while retaining all task tools, photos and settings.

Version **1.7.0** adds local update checks and installation, direct shortcut removal inside Links, drag ordering for Links and dashboard pins, a simpler Tasks sidebar, and dark panel backdrops without blur. See the Spanish [1.7 guide](GUIA-1.7.md).

Version **1.6.0** adds checklists, optional desktop reminders, daily/weekly/monthly recurrence, a weekly calendar, right-click task capture, estimated and tracked time, exam study planning, reusable templates, weekly progress by subject, and Ctrl+K search across tasks, lists and links. See the Spanish [1.6 guide](GUIA-1.6.md). Existing data migrates to schema 5 without losing photos, answers, dates or settings.

Pinned shortcuts support logo-only, name-only or both, an optional dark surface, and direct removal with Undo. Reference photos open in an enlarged viewer. AI defaults to hints and study guidance, with photo sharing opt-in per task draft.

Version 1.5.1 adds task details, up to four JPG/PNG/WebP photos per task, and a Gemini assistant (free tier) with guidance modes. Click a task title to open its details. Photos and details work offline. AI requires the separate **Sebams Bridge** service and a free Gemini API key configured there. No API key is entered in Chrome. Without a key, **Copy for ChatGPT** prepares the prompt; download and attach the task photos manually in ChatGPT.

In **Settings → AI**, enter the connection code shown by Sebams Bridge and allow access to the local connection. The Bridge includes MCP tools for conversational task creation from ChatGPT. Connecting those tools to your ChatGPT account is a separate setup step; see the Bridge's Spanish guide. Chrome receives pending tasks every minute while the Bridge and Chrome are running, or sooner with a Sebams tab open. The service queues tasks while Chrome is closed. The extension itself needs no account or installation packages.

AI sends only the selected task's title, details, priority, date and list when you click **Ask AI**. Photos are sent only with **Include reference photos in this AI request** enabled. An answer is saved with the task, and the completion checkbox stays under your control. Backups include photos and answers but exclude the local connection code. Version 1.5.1 upgrades older data in place.

A calm, local-first new tab for Chrome. Original code, an original Sebams mark, three generated scenic backgrounds, and an optional online landscape collection. The composition follows the familiar clock, greeting, focus, weather, and corner tools in the [official Momentum reference](https://chromewebstore.google.com/detail/momentum/laookkfknpbbblfpciffpaejjkokdgca).

## Update to 1.8.0

Replace the files in your existing Sebams folder with this release, then click **Reload** on its card in `chrome://extensions` and open a new tab. Keep the same folder location and installed extension to retain its local data. Existing tasks, dates, notes, pinned links, settings, images, and backups upgrade automatically. Version 1.0 tasks start without a date and its links start unpinned. Chrome may ask you to accept the added context-menu capability. Notification permission is requested separately for optional desktop notifications. Opening reminders need no notification permission. Export a backup before moving the extension to a different folder or computer.

Version 1.4 opens Links as a compact menu beside its dashboard button, with website icons and direct navigation. The plus button adds a link; the options menu opens link management. **Settings → Appearance → Random online background** chooses a different photograph from the API collection and keeps it as your selected scene. The photo is downloaded and validated before the choice is saved, so a failed request keeps the preceding background. This update uses the same data format and permissions as version 1.2.

Version 1.3.1 adds **Rename list** and **Delete list** below the selected subject's heading. Renaming updates its tasks automatically and refuses duplicate names. Deleting moves its tasks to Inbox, preserving text, completion, priority, dates, and order; **Undo** restores the list. Inbox is the permanent default and cannot be renamed or deleted.

## Install

1. Extract the ZIP to a permanent folder. Keep the extracted files there while using the extension.
2. Open `chrome://extensions` in Chrome 120 or newer.
3. Turn on **Developer mode** at the top right.
4. Choose **Load unpacked**, then select the **Sebams** folder containing `manifest.json`.
5. Open a new tab. If Chrome asks whether to keep this new-tab page, choose **Keep it**.

The dashboard, task details and photo attachments need no build, account, API key, or package installation. The optional Gemini assistant needs Sebams Bridge and an API key; ChatGPT MCP also needs a separate account connection. Chrome shows the location and favicon capabilities during installation; Sebams uses location only after you choose **Use my location**. Weather, photo and local Bridge access are requested separately when enabling each feature. See [PRIVACY.md](PRIVACY.md).

## A short guide

- Enter your optional name during onboarding, or skip. Change it later in **Settings → General**.
- Enter one main focus below the clock. Use its checkbox to complete it, its pencil to edit, or its cross to archive. An unfinished goal stays visible on later days until you keep it for today or archive it. Past focus appears in **Settings → Workspace**.
- Open **Tasks** and choose a subject or list in the left sidebar. **New list** adds a subject such as Mathematics or a collection such as Personal errands. There are up to 20 lists per workspace. **All tasks**, **Today**, **Upcoming**, and **Completed** offer views across all lists. Sidebar counts show unfinished tasks, except Completed, which counts finished tasks. The current heading also shows open and completed totals. On narrow screens, navigation becomes two scrollable rows above the tasks.
- Use the form at the bottom to add a task, choose its list, priority, and optional date. Dates can be changed or cleared while editing. The date filter also offers **Overdue** and **No date**, and can narrow a particular subject's tasks. Completed tasks are excluded from Overdue. Arrows reorder items within the current view; the pencil edits and the bin deletes. Deletion offers **Undo** for 12 seconds. Adding a task that does not match the active date filter switches to All dates so the new item stays visible.
- Open **Links** to see your saved websites in a compact menu with their icons. Each opens with one click. **+** adds a link; **… → Manage links** lets you rename, remove, organize folders, reorder, or pin links. The arrow returns to the compact list, and Escape closes it. The options menu also changes workspace. Only your saved links appear; the screenshot examples are not added to your data. Choose **Pin to dashboard** while adding/editing a link, or use its pin button. Up to eight pins per workspace appear in a vertical dock at the left. Pins follow your link order. Website icons in the menu and dock use Google's favicon service, with Chrome's cached icon as a fallback. **Settings → Appearance** lets you turn off online icons and hide the names beside pinned icons. Names remain available to assistive technology and on hover.
- **Settings → General → Visible in this workspace** lets you show or hide Quick notes, the Focus timer, Habits, the main daily focus, the background selector, and the background favorite button separately. Hiding a tool keeps its data and does not stop a running timer. Quick links and pins, search, weather, and tasks have their own switches too. Backgrounds can still be changed through **Settings → Appearance** when their dashboard selector is hidden. The daily quote switch is shared across workspaces.
- The search field shows its provider. Click the provider name, or use **Settings → General**, to choose Google, DuckDuckGo, or Bing. Press Enter to search.
- Click the scene title at the lower left to choose a background or upload an image. Choosing a scene keeps it until you change the background mode. The heart saves favorites; rotation can use all scenes or only your favorites. **Rotation frequency** offers each day, each hour, or each new tab. Hourly changes also occur in an already-open tab. The arrow at the lower left advances to the next scene immediately. JPG, PNG, and WebP uploads support up to 8 MB each and 24 MB combined, with a maximum of 12 uploaded scenes.
- In the background panel, choose **Enable online photos** to allow access to [Lorem Picsum](https://picsum.photos/). The collection contains up to 12 scenic photographs with links to their photographers. It requires no API key. You can select and favorite each photo. The last four full-size backgrounds used are cached locally, separately from uploads, up to 16 MB total. Cached photos work offline; an uncached photo falls back to a bundled scene. Turning the collection off keeps your favorites and metadata. **Clear photo cache** removes downloaded online backgrounds and turns the collection off. Online image bytes are not included in backups.
- **Settings → Appearance** adjusts panel opacity, panel blur, background blur, and clock size. Changes preview immediately and persist. **Reset appearance** restores those controls and pinned-name visibility.
- **Settings → Appearance → Random online background** chooses a random photograph from the online collection, avoiding the current photo when another is available. Chrome asks for photo access on first use. The selected photo uses the existing four-image offline cache and stays selected after reload. Each click chooses another photo; automatic rotation remains available through Background changes and Rotation frequency.
- Open **Quotes** to select a quote, save favorites, hide quotes, or add your own words. Verified source links are available for the bundled excerpts.
- Click **Weather**, enter a city, choose **Find**, and select a result. You can use your location instead. Readings show when they were updated. Change Celsius/Fahrenheit or turn weather off in that panel.
- **Focus** opens the timer. Choose work/break lengths, start, pause, resume, reset, or switch sessions. Focus view hides secondary widgets. Ended sessions wait for you to start the next one. Sound is optional and requires an active Sebams tab; Chrome may suppress sound until you interact with the page.
- The note icon opens autosaving **Quick notes**. If two tabs edit the same note, the older editor retains its draft and offers a downloaded copy before loading the latest saved note.
- The leaf icon opens up to eight gentle daily **Habits** per workspace. Checking a habit records today's progress; it starts unchecked on the next day.
- **Settings → Workspace** switches Personal, Work, and Study. Each remembers links, lists, tasks, notes, habits, and widget visibility. Your name, scenery preferences, daily focus, and timer are shared.
- **Settings → Data** exports a backup including uploaded images. Import replaces Sebams data, validates its structure and images before saving, and offers immediate undo. Undo refuses to replace changes made after the restore. Treat backups as private files.

Escape closes a panel and returns focus to its control. Keyboard focus is visible, forms have descriptive labels, and task/link reordering has button alternatives to dragging. Initial page loading never focuses a dashboard field, preserving normal address-bar behavior.

## Source and architecture

```text
manifest.json          MV3, new-tab override, scoped permissions and CSP
newtab.html            Accessible dashboard shell and local icon symbols
styles.css             Responsive layout, contrast shading, reduced motion
app.js                 Dashboard, task workspace, and tool panels
service-worker.js      Chrome alarm scheduling and closed-tab timer recovery
lib/ai.js              Authenticated local AI requests and manual ChatGPT prompts
lib/bridge-sync.js     Import queued MCP tasks, deduplicate, acknowledge after save
lib/model.js           Defaults, local-day rollover, strict validation/limits
lib/tasks.js           Local task-date labels and date-view filtering
lib/photos.js          Opt-in Picsum collection, metadata checks, rotation
lib/favicons.js        Domain-only website icon URLs and Chrome cache fallback
lib/store.js           Transactional IndexedDB, cross-tab updates, images, backups
lib/timer.js           Pure persisted-deadline timer transitions
lib/weather.js         Opt-in Open-Meteo requests, cache and unavailable states
lib/content.js         Bundled scenes, attributed quotes, search providers
lib/ui.js              Safe DOM construction, URL checks, reorder and download helpers
assets/                Original local JPG backgrounds, SVG mark and PNG icons
tests/                 Automated verification
```

Vanilla JavaScript ES modules, HTML, and CSS keep the extension small and maintainable. There are no production dependencies, remote executable scripts, remote fonts, or build step. System fonts use the device's local font stack. The manifest follows Chrome's [remote-hosted-code policy](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code).

One IndexedDB read/write transaction reads the freshest state before applying each mutation. Separate tabs cannot replace unrelated newer data with stale snapshots. BroadcastChannel and focus/visibility refreshes update open views; editors use conflict checks for notes, tasks, links, and focus text. Image metadata and image blobs are stored together in transactions. Backup export reads a consistent snapshot; restore validates everything before one atomic replacement. Storage failures show a visible error instead of reporting success.

Timer state stores an absolute deadline rather than counting interval ticks. An open page reconciles it each second, and Chrome alarms reconcile it while tabs are closed. Browser startup and the next page opening recover expired sessions. A closed browser cannot play a sound or execute an alarm until it starts again.

## Development and verification

Load the folder directly, edit local files, then click Reload on `chrome://extensions` and open a fresh new tab. For the dependency-free unit tests, use Node 24:

```sh
npm test
```

In a restricted test environment that prevents child processes, use `node --test --test-isolation=none tests/*.test.mjs`.

The browser QA scripts use Playwright as a development-only dependency and a separate profile. See [VERIFY.md](VERIFY.md) for actual tested scenarios and the remaining manual checks. This is an unpacked extension, not a Chrome Web Store publication. Calendar services and cloud synchronization remain future enhancements. The optional AI and MCP service is delivered separately.
