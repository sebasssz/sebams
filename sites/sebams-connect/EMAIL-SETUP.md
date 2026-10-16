# Email account configuration

This app retains Sites-managed ChatGPT sign-in for its existing MCP connector. The separately requested Sebams email accounts use their own verified-email identity and bearer sessions for extension account/group APIs. They do not replace or bypass the Site MCP OAuth boundary.

Configure these production runtime secrets through native Sites environment tools, never in source or the extension:

- `SEBAMS_AUTH_SECRET`: a cryptographically generated value of at least 32 characters, kept stable across deployments. It protects verification digests and rate-limit keys.
- `BREVO_API_KEY`: the account's transactional email API key.
- `SEBAMS_EMAIL_FROM`: an email sender verified in that Brevo account. The display name is Sebams.

The sender must be verified and transactional sending must be enabled by Brevo. Its free plan currently advertises 300 emails per day; the app caps code requests at 250 per UTC day for the entire project, with additional per-email and per-IP limits. Other Brevo account usage shares provider quotas. Check the provider's current plan before scaling.

After configuring secrets, deploy a saved version to apply that environment revision. `GET /api/account` reports only `emailEnabled`; it never returns key values. Until configuration is complete, code requests return 503 and no mail is simulated. Test delivery only to an address explicitly supplied for that test; never use real user tasks in fixtures.

Private local setup may be supplied in the workspace-only `work/private/EMAIL-CONFIG.env`. That directory is excluded from source and release packaging. Never commit it or copy values into this document. The extension stores its own random account session in IndexedDB's private store; personal backups exclude sessions, tokens and group caches.

See [Brevo's email API](https://developers.brevo.com/reference/send-transac-email) and [transactional email plan](https://www.brevo.com/products/transactional-email/).
