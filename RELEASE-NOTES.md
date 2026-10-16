Sebams 2.1.0

- Email-code account UI and server with single-use expiring codes, rate/attempt limits and independent device sessions. Delivery remains disabled until the owner configures the verified Brevo sender and private server secrets.
- Full personal sync: profiles, tasks/extras, notes, links, habits, settings, uploaded backgrounds and reference photos. Optimistic revisions, independent-change merging, explicit conflict choices and a previous local recovery copy. Device timer execution and private connection tokens stay local.
- Groups in the Inbox/view dropdown and sidebar. Six-letter invitations, persistent membership, named assignees, dates/priorities, assignee-only completion and leader-only rename/member/delete/restore controls. Personal data is not shared with a group.
- Preserve the existing ChatGPT connector; account switching pauses the old connection and disconnecting ChatGPT retains host access needed by an active Sebams account.

Checks: 80 extension unit tests, 22 server tests, 7 two-device/group Chrome scenarios, 11 ChatGPT regressions, 14 UI/profile regressions, TypeScript and production build. Real email delivery is pending private sender configuration.
