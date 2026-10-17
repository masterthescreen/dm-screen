# Nyxi development setup

Deploy branch `nyxi-integration-dev` to your **development** Node.js app. Keep production unchanged.

1. Use a separate dev MySQL database. Copy existing DB_HOST, DB_PORT, DB_USER, DB_PASSWORD and DB_NAME settings for that dev database. No additional MySQL user is required. The existing user needs CREATE TABLE, SELECT, INSERT and UPDATE privileges (plus privileges already required by the app).
2. Set server-only OPENAI_API_KEY and NYXI_MODEL to a function-calling Chat Completions model available in your API account. API usage has separate billing from ChatGPT. No key is included in this repository.
3. Optionally set NYXI_APP_KEY to at least 32 random characters for an external agent. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Keep it out of chats, client code and Git. Rotate or remove it to revoke external access.
4. Run `npm ci`, `npm run build`, then restart the Node app with `npm start`.
5. Sign in as GM, open Nyxi, and ask “Summarize my GM notes.” Then “Create a GM note titled Nyxi dev test with content Integration is working.” Verify the saved note and open Change history & undo. Undo it and verify it disappears.
6. Test player login: Nyxi stays hidden and all /api/nyxi endpoints reject player access. Try changing sharing or a player sheet through Nyxi: it must refuse. Test stale writes from two tabs: the second save must display a conflict, leaving the rejected draft visible. Copy the draft before reloading.

## External scoped API

Use HTTPS and `Authorization: Bearer <NYXI_APP_KEY>` for:

- GET /api/nyxi/context?dataset=world (also gmnotes, monsters, encounters, combatants, encountertables, dicehistory, players). Omit dataset to read all. Players use the existing explicit public-field allowlist; hashes, codes, session secrets and credentials are excluded.
- POST /api/nyxi/change: JSON `{ "dataset":"gmnotes", "revision":"<from context>", "operation":"create", "fields":{"title":"Test","content":"Hello","tags":[]}, "reason":"GM requested test note" }`.
- Update/delete one entry with its id and current dataset revision. Nested lore or table-entry creation takes parentId and collection. Dataset replacement, child-array replacement, sharing changes and deletion of populated containers are blocked. New IDs/timestamps come from the server.

The key cannot log in as GM, use player management endpoints, access AI chat, view audit snapshots or undo changes. It grants the same limited campaign writes as the sidebar, and broad sanitized GM reads. Store it only in the authorized external agent. These HTTP endpoints do not automatically register a ChatGPT connector or MCP server.

## Recovery and limits

Every successful Nyxi write stores full before/after snapshots and its reason in codex_nyxi_audit, atomically with the write. The GM-only history lists the last 50 changes; older rows remain in MySQL. Undo creates another logged snapshot and refuses if later edits would be overwritten. There is no automatic pruning; include this table in normal backups.

Browser campaign saves use revision checks and share row locks with Nyxi. Failed saves are shown in Nyxi's sidebar; unsaved drafts remain on screen and browser reload/close warns while dirty. Copy unsaved work before reloading. No automatic overwrite or retry occurs after a failed save.

Chat permits one entry mutation per turn, reads relevant datasets on demand (160k character limit per result), and has bounded tool rounds and request timeouts. Bulk operations require separate turns; the external key holder is trusted to issue only authorized individual operations. Chat is in browser memory and clears on reload. Saved notes and audit records persist. No ChatGPT conversation history/persona memory is imported. AI tool-use intent follows system instructions; database records are treated as untrusted data. Review behavior with test campaign content before production.

Live API/database and visual browser tests must be run in dev: no production credentials were used during implementation.

Next.js and eslint-config-next are pinned to 15.5.28, replacing 15.3.3. This includes the October 14, 2026 Next.js security fixes. Reinstall dependencies and rebuild when deploying this update.

The Next.js security update also pins its transitive PostCSS dependency to 8.5.30 and refreshes Sharp to 0.35.5 within Next.js's supported range. Use Node.js 20.9 or newer for Sharp 0.35.5.
