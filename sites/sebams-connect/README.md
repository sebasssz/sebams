# Sebams authenticated connector source

These files are the task/MCP implementation deployed on Sites. The service supports public visitors; task pages and operations require sign-in and data is isolated by the authenticated Site-scoped account identity. Public service access is separate from OpenAI plugin-directory approval.

To create a separate connector, start with the Sites Vinext starter, copy these application/database files, declare D1 `DB` and capability `mcp`, generate/apply the schema migrations, build and publish through Sites. Sites manages sign-in and OAuth. Use the resulting Site origin in the extension’s chatgpt.js, optional host permissions, externally_connectable and CSP. This directory is an implementation overlay, not a standalone starter. No credentials or task data are included.
