# CLAUDE.md

Notes for working in this repo. Keep this file current when the facts below change.

## What this is

drumline is a browser app for solving "marching band" variety crosswords (rows plus
concentric bands, no down clues) together with other people in real time.

It is three separate npm packages in one repo. It is **not** an npm workspace.

| Package           | What                                                       | Deployed to                                       |
| ----------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| `drumline-lib`    | Shared TypeScript: puzzle parsing, grid geometry, game state, actions | Consumed by the other two via `file:../drumline-lib` |
| `drumline-server` | Express REST + `ws` WebSocket relay, Redis storage         | Railway (`railway.toml`, root `package.json`)     |
| `drumline-client` | SvelteKit 1 / Svelte 4 static SPA                          | GitHub Pages at drumline.rudesoftware.net (`.github/workflows/pages.yml`, `static/CNAME`) |

The root `package.json` exists only for Railway: `postinstall` installs lib and server,
`build` builds both, `start` runs `drumline-server/dist/index.mjs`.

## Toolchain and gotchas

- Node is pinned to 18.12.1 (`.nvmrc`, `engines` in root and server, `engine-strict=true`
  in `.npmrc`). On a newer Node run `npm install --engine-strict=false` inside each package.
- npm 9+ **copies** `file:` dependencies instead of symlinking them, and rewrites the
  lockfiles. Do not commit that lockfile churn. If the client or server sees a stale lib,
  relink it:
  `rm -rf node_modules/@chrisrude/drumline-lib && ln -s ../../../drumline-lib node_modules/@chrisrude/drumline-lib`
  and delete `node_modules/.vite` in the client.
- `@chrisrude/drumline-lib` is not published to npm. Both consumers depend on
  `file:../drumline-lib` and import from `dist/`, so **build the lib first** after any lib change:
  `cd drumline-lib && npm run build`.
- Import only from the package root `@chrisrude/drumline-lib`. Deep imports like
  `@chrisrude/drumline-lib/lib/...` break the client build. If something is needed, export it
  from `drumline-lib/index.ts`.
- Prettier: 4 spaces, single quotes, no trailing commas, width 100. The client is on
  Prettier 2 with `prettier-plugin-svelte` (`--plugin-search-dir .`); lib and server are on
  Prettier 3. Run `npm run format` in the package you touched.
- ESLint configs extend only `plugin:@typescript-eslint/recommended`, not `eslint:recommended`,
  so rules like `no-case-declarations` are off. Fall-through `switch` cases are used on purpose.

## Verify a change

Run in this order. All of it is green as of the last review.

```sh
cd drumline-lib    && npm run lint && npx tsc --noEmit && npx vitest run && npm run build
cd drumline-server && npm run lint && npx tsc --noEmit && npm run build
cd drumline-client && npm run lint && npm run check && npm run build
```

- Only automated tests: `drumline-lib/lib/puzzle.test.js` (vitest) and one Playwright
  smoke test in `drumline-client/tests/test.js` (needs `npm run build && npm run preview`).
  `drumline-client/tests/*.input` are sample puzzle texts, not used by automated tests.
- No CI runs lint or tests. The Pages workflow only builds the client on pushes to `main`
  that touch `drumline-lib/**` or `drumline-client/**`.
- The server needs a Redis at `REDIS_URL` (default `redis://localhost:6379`) to start.
  `npm run dev` in the server runs rollup watch plus `node --watch`.
- Client dev: `npm run dev` (Vite on 5173). In dev it talks to `localhost:8080`; in prod
  to `drumline-server.rudesoftware.net` (`src/lib/stores/settings_store.ts`, hard-coded).

## Domain model

- **Puzzle text format** (parsed by `drumline-lib/lib/clue_parser.ts`): a `ROWS` header, then
  lines like `1 a clue text` / `b next clue`, with unlabeled lines appended to the previous
  clue; then a `BANDS` header with `A a clue` / `b clue`. Row count must equal
  `2 * bands + 1`, which is also the grid size. `Puzzle` keeps `original_text`, `row_clues`,
  `band_clues`, `size`.
- **Puzzle id** is SHA-512 of `original_text + SECRET_PUZZLE_ID_SALT`, rendered as roughly
  52 emoji (`drumline-server/src/emoji-encode`). Same text gives the same id. Ids appear in
  URLs and Redis keys `puzzle:<id>`. Changing the salt changes every id.
- **Solve id**: the client uses the puzzle id as the solve id (route `/puzzles/:size/:id`),
  so everyone opening a puzzle shares one solve.
- **User identity**: a v4 UUID generated in the browser and kept in localStorage
  (`drumline-uuid`) is the *private* id. It is sent in REST bodies, in the list URL, and in
  every WebSocket action. The server converts it to a v5 *public* UUID (`UserId` in lib)
  before echoing actions to other clients. Never log private ids; the client UI promises
  users that activity is not logged.
- **Grid geometry** (`drumline-lib/lib/cell_attributes.ts`, memoized by size): bands are
  numbered from the outside in and traversed clockwise from the top-left corner. Rows skip
  the center cell (`row_offset` is -1 there). `GridAttributes.num_bands` counts the center
  cell as a band; `GameState.band_answer_segments` does not.
- **Sync model**: `GameActions` (`set`, `clear`, `cursor`, `removeCursor`, `markSegment`,
  `clearSegment`, `joinPuzzle`, `leavePuzzle`) travel as JSON strings over the WebSocket.
  The server appends every non-cursor action to the Redis list `solve:<id>:actions` and
  assigns `change_count` as the list index when reading back. New actions from a client
  carry `change_count: -1`. On `joinPuzzle` with a known count the server backfills from
  `count + 1`, then sends the other clients' last cursor positions. Cursor actions are held
  in memory only.
- **Client state** (`drumline-client/src/lib/network/networked_game_state.ts`): keeps the
  server-confirmed `GameState` plus a `_pending_actions` list, re-applies pending actions on
  top of each server update, and matches echoes against pending actions with
  `areActionsEqual` (where `change_count` -1 matches anything). It persists
  `{game_state_json, pending_actions, server_update_count}` to localStorage under
  `drumline-game-state-<id>`. A `change_count` gap throws and stops sync (see TODO.md).
- **Server env**: `PORT`, `REDIS_URL`, `CORS_ALLOW_URL`, `SECRET_PUZZLE_ID_SALT`,
  `ADMIN_USER_UUIDS` (comma/space separated private ids that may list all puzzles).
  Defaults live in `drumline-server/src/secrets.ts`.

## Code conventions

- Files use `export { ... }` / `export type { ... }` at the top, then definitions below.
- `snake_case` for functions and fields in lib and server; Svelte components mix camelCase.
- Action constructors in `lib/game_actions.ts` return `user_id: ''` and `change_count: -1`;
  `NetworkedGameState` fills in the user id before sending.
- `ClueGrid.svelte` contains expressions like `(!gameState || gameState)` and
  `isDragging = false; isDragging = true`. They exist only to force Svelte re-renders after
  in-place mutation of `GameState`. Do not "simplify" them away without replacing the
  reactivity they provide.
- `vite.config.js` silences the `unused-export-let` Svelte warning on purpose.
