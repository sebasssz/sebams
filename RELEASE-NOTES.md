Sebams 2.0.1

- Fix Links toolbar overlap: Add, Options and Close use separate targets in a stable header at desktop and mobile widths, including while scrolling. The row ellipsis opens link editing instead of being an inert reorder button.
- Recover ChatGPT sync after a JSON 401 response, sign-in HTML, network failures or incomplete pairing. Verify tracked connection tabs before reuse so stale or recycled tabs cannot prevent synchronization. Account mismatch checks remain enforced and provider errors remain visible.
- Detect pending Chrome reload after a file update. Settings offers Finish update and reload and blocks sending new profile data to an old background worker; this avoids the misleading unsupported-state-fields sync error. Existing local tasks, references, profiles and connection settings are preserved.

Validation: 75 unit checks, 3 Links recovery scenarios, 7 connection transport/reload scenarios, 11 ChatGPT regressions and 6 Links/photo scenarios using isolated test data. Public release digests and updater install/backup are verified after publication.
