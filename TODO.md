# TODO

Improvements noted during the September 2026 code review, roughly in priority order.
Items that were small and safe were fixed directly in that review; these are the rest.

## Correctness and security

- [ ] **Anyone can take ownership of a puzzle.** `savePuzzle` uses `hSet` for
      `author_uuid`, so re-posting the same clue text from a different user overwrites the
      author and lets that user delete it. Use `hSetNX` for the author field (or key puzzles
      by author) and decide what a second "create" of an existing puzzle should return.
- [ ] **Client sync breaks permanently on a `change_count` gap.** `_on_server_data` throws
      if `server_update_count + 1 !== action.change_count`. Instead, drop local state and
      re-join with `change_count: -1` to resync.
- [ ] **Validate action bounds on the server** before storing/echoing: `row`/`col` inside
      the grid, `index` inside the row/band count, segment indices inside the group. An
      out-of-range action from one client currently throws inside every other client's
      `apply()`.
- [ ] **WebSocket hardening**: set `maxPayload` on `WebSocketServer`, rate-limit messages
      per connection (there is a `todo` in `echo.ts`), and cap `input_text` size on
      `POST /puzzles`.
- [ ] **Private id in a GET URL**: `GET /puzzles/list/:user_uuid` puts the private uuid in
      request logs. Move it to a header or POST body (noted as `todo` in `puzzle-crud.ts`).
- [ ] `GameState.applyGridAction` and `getAnswerSegments` do not bounds-check the incoming
      coordinates on the client side either; a bad stored action in localStorage makes
      the page throw on load.
- [ ] Deleting a puzzle leaves `solve:<id>:actions` behind, and solves never expire
      (`drumline-server/cron/todo` mentions this). Add TTLs or a cleanup job.
- [ ] `list_puzzles` uses Redis `KEYS puzzle:*` plus one round trip per key. Keep a set
      of puzzle ids per author (and a global set for admins) or use `SCAN`.
- [ ] CORS allows `localhost:5173` and `localhost:4173` in production.

## Product / design gaps

- [ ] Solve id equals puzzle id, so there is exactly one shared solve per puzzle. The
      protocol already carries a separate `solve_id`; add a way to start a private solve.
- [ ] `is_solved` means "every non-center cell is filled", not "correct". Confetti fires
      on a full grid. Either rename it or add an answer key / checking mode.
- [ ] Touch support: answer selection by dragging is mouse-only (`answer_select.ts` has a
      `TODO: ipad dragging`), and the layout assumes a landscape viewport (`50vw`/`90vh`).
- [ ] `PuzzleView` shows "WHOOPS NO PUZZLE" when the route params are missing, and the
      clue lists show "Loading..." forever if the puzzle can't be found. Add real
      loading/error states and a way back to `/`.
- [ ] `PuzzleListInfo.your_puzzle` is always `false` for locally cached puzzles; the recent
      list is never pruned; per-solve localStorage entries are never cleaned up.
- [ ] Puzzle ids are ~52 emoji, which makes for very long URLs. Consider truncating the
      hash (collision risk is negligible at 128 bits) if URL length matters.
- [ ] Clue list: no way to mark clues done (`ClueList.svelte` has `class:clueDone={false}`
      and a TODO).

## Code health

- [ ] Replace the reactivity hacks in `ClueGrid.svelte` (`(!gameState || gameState)`,
      `isDragging = false; isDragging = true`) with an explicit version counter or
      immutable state updates.
- [ ] Dead code: `drumline-lib/lib/solver.ts` (`Solver`, `CursorType`) is unused;
      `AsyncSolveStore` in `echo.ts` is unused and does not match `SolveRedisClient`;
      `SolveRedisClient.connect/disconnect` are unused; `solveHmac` in `crypto.ts` is unused;
      `ConnectionInfo` only exists to build two URLs.
- [ ] `puzzleHmac` is a salted hash, not an HMAC. Rename, or use `crypto.createHmac`.
- [ ] `NetworkedGameState` has a comment saying it "probably shouldn't exist" and should be
      folded into a `SolveClient`. Agreed: it mixes transport, persistence and game state.
- [ ] Client server URLs are hard-coded in `settings_store.ts`; move to `VITE_*` env vars.
- [ ] `svelte.config.js` imports `svelte-preprocess`, which is only present transitively.
      Add it to `devDependencies`. `@sveltejs/adapter-auto` and `@types/cookie` are unused.
- [ ] Root `.prettierrc` sets `pluginSearchDirs`, a Prettier 2 option; lib/server are on
      Prettier 3. Move the client to Prettier 3 + `prettier-plugin-svelte` 3 and share one
      config.
- [ ] The `.vscode/settings.json` cSpell list still contains `REDISUSER`/`REDISPASSWORD`,
      which are no longer read.

## Tests and CI

- [ ] Add a CI workflow that runs lib tests, `eslint`, `tsc`, and `svelte-check` on pull
      requests. Nothing runs them today.
- [ ] Unit tests are missing for the parts that matter most: `cell_attributes`
      (band/row traversal, corners, center handling), `AnswerSegments` overlap logic,
      `stringToAction`/`areActionsEqual` round-trips, `clue_parser` edge cases (blank lines,
      continuation lines, wrong row count), client `cursor.ts` and `word_grouping.ts`.
- [ ] Server: an integration test around `EchoServer` + `SolveRedisClient` using an
      in-memory store or `redis-memory-server`.
- [ ] The Playwright test only checks the landing page heading.
- [ ] The Pages workflow runs the root `npm ci`, whose `postinstall` also installs the
      server. Install only `drumline-lib` there.

## Tooling

- [ ] Node 18 reached end of life in April 2025. Move `.nvmrc`/`engines` to Node 22, drop
      the `<19` cap, and regenerate the three lockfiles with a current npm (note that npm 9+
      copies `file:` deps rather than symlinking them; consider making the repo an npm
      workspace so the lib is linked properly).
- [ ] The lib `test:unit` script starts vitest in watch mode; use `vitest run` for CI.
- [ ] Add a root README with setup steps (currently only `CLAUDE.md` documents this).
