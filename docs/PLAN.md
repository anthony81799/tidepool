# Jellyfin client: build plan

## Context

**Tidepool** (`github.com/anthony81799/tidepool`) is a custom Jellyfin client for web, Linux desktop, Android, and Fire TV. It doubles as a hands-on project for the "2026 Learning Roadmap" (Obsidian: `Main Notes/Programming/2026 Learning Roadmap.md`). Each language gets the job its roadmap phase is about:

| Language       | Roadmap focus                                     | Job in this app                                                                                                                |
| -------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **TypeScript** | Architecture, DDD, type-level programming         | The one UI codebase (all platforms), domain model, players and readers                                                         |
| **Rust**       | Systems, FFI, Tauri (Phase 2 Project 5)           | Tauri 2 shell for desktop, Android, and Fire TV; native plugins (secure token storage, offline downloads, media-session/MPRIS) |
| **Go**         | Cloud, concurrency, gateway (Phase 1 capstone)    | "Companion" service: book reading positions, home-feed aggregation, job dispatch, Prometheus metrics, serves the web build     |
| **Python**     | Data, async, video processing (Phase 4 Project 4) | Workers: intro/outro detection fallback, watch/listen stats and recommendations, dev tooling (seed a test server with media)   |

## Architecture (decided)

- The Jellyfin server (C#, existing) remains the source of truth for the library, streams, progress, watched/played state, and favorites.
- Clients call **Jellyfin directly** for everything Jellyfin already does. They call the **Go companion only for extras**. If the companion is down, the app still works with fewer features. Proxying video through Go would add latency and a single point of failure.
- UI: **TypeScript + React (Vite)**, using the official `@jellyfin/sdk`. Ship it as a plain web app on the web. Wrap it in **Tauri 2** for Linux, Android, and Fire TV (Fire TV is an Android build with a TV launcher entry and D-pad focus navigation).
- Video: `hls.js` for transcoded streams, direct play when the device profile allows, and **JASSUB** (libass compiled to WASM, the same library jellyfin-web uses) for ASS subtitles. Trickplay (seek-preview thumbnails) comes from the server's native trickplay data. Skip intro/outro comes from the server's **Media Segments** API.
- Books: **foliate-js** (EPUB, MOBI, AZW3, FB2, CBZ) and **pdf.js**. The Go companion stores the precise reading position (EPUB CFI or PDF page). The percentage is also written back to Jellyfin so other clients see progress.
- Music: a queue/player service in TypeScript. "Play artist" pulls all of the artist's tracks, then shuffles them or orders them by album.
- Go companion: SQLite storage. Auth passthrough: it validates the caller's Jellyfin token against the server, so it never stores passwords.
- Python: managed with `uv`. Workers pull jobs from the Go companion over HTTP (or gRPC once you reach roadmap Go Project 2).
- Server support: **Jellyfin 12.x** only (it runs the real library). 10.11 and older are out of scope.

## Blockers / risks (read before starting)

1. **DRM Kindle files (KFX, DRM-protected AZW) cannot be supported.** Only DRM-free MOBI and AZW3 can be read. Plan for DRM-free files.
2. **Fire TV target: Insignia 43" F50 Series 4K Fire TV.** It runs Fire OS (Android-based), not Vega OS, so a Tauri Android APK can be sideloaded. Check the exact version under Settings → My Fire TV → About: Fire OS 7 is based on Android 9, Fire OS 8 on Android 11. That version sets the minimum Android version and the WebView features you can rely on.
3. **Android/Fire TV WebView playback.** MSE/HLS works, but direct-play codec support varies by device, so the device profile must lean on server transcoding. Fallback: a Tauri plugin that bridges to Media3/ExoPlayer. That plugin needs Kotlin, which is outside the four languages.
4. **Skip intro needs segment data.** Native-first: install the Intro Skipper plugin on the server. The Python detector is the learning track and an optional fallback.
5. Verify every endpoint against **your 12.x server's** OpenAPI spec (`/api-docs`), not against tutorials. Endpoints have moved between 10.8, 10.9, 10.10, 10.11, and 12.0.
6. **12.0 client breaks** (release notes): `/emby/` and `/mediabrowser/` prefixes removed; legacy authorization off by default (use the `Authorization` header); `GET /QuickConnect/Initiate` removed (use POST); the same `GetItems` query can return different results than on 10.11; `GetArtists`/`GetAlbumArtists` obsolete; version strings no longer start with `10.`.
7. **SDK version:** use `@jellyfin/sdk` 1.0.x, which its README maps to Jellyfin 12.x.

## Phased plan (each phase ends with something that runs)

### Phase 0: Workspace and tooling

- Run `git init` and create a monorepo: `apps/web` (TS), `apps/tauri` (Rust shell), `services/companion` (Go), `workers/` (Python), `packages/core` (shared TS domain + API layer), `docs/`.
- Pin toolchains with `mise`: Node LTS + pnpm, Rust stable + Android targets, Go, Python + uv.
- VSCodium: create a multi-root `.code-workspace` with one root per language. Install these extensions from Open VSX: rust-analyzer, Go, Python + Ruff, Oxc (oxlint), Prettier, Tauri, Even Better TOML, EditorConfig.
- Add one task runner (`just`) with `dev`, `test`, and `lint` targets per package. Add pre-commit hooks for formatting.
- Run a **dev Jellyfin server in Podman** with a small sample library: a TV episode with ASS subtitles, a movie, an album with lyrics, an EPUB, a PDF, an AZW3, a CBZ and a CBR, and an audiobook with chapters. Enable trickplay. Install the Intro Skipper and OpenSubtitles plugins. Create a second, parental-restricted user.
- Done when: `just dev` starts the empty web app and the Jellyfin container comes up.

### Phase 1: TS core (web)

- Server discovery or manual URL entry, login with **Quick Connect** or username/password, and token persistence.
- **Multiple servers and users:** a saved-server list, a user picker, and fast switching that keeps a separate session per server and user.
- Domain layer in `packages/core`: Item, Series/Season/Episode, Movie, Album/Artist/Track, Book, Comic, Audiobook/Chapter, and UserData. Map SDK types into your own types so the UI never touches raw DTOs. This is the DDD practice.
- Library browse, item detail pages, posters and backdrops.
- **Search across all media types**, with results grouped by type.
- **Parental controls:** the server enforces them. The client must never cache or show items across users, and must handle "not allowed" responses cleanly.
- Done when: you can log in to two servers as two users, browse every library, search, and see artwork, and the restricted user can't see restricted items.

### Phase 2: Video playback

- Device profile, then the playback-info request, then a direct-play or HLS decision.
- Seeking, audio/subtitle track selection, ASS rendering through JASSUB, trickplay hover thumbnails.
- **Quality/bitrate selection** (auto plus manual caps), which re-requests playback info. **Playback speed.**
- **Subtitle styling** for non-ASS subtitles (size, color, background, position), saved per user. ASS subtitles keep their own styling.
- **External subtitle search and download** through the server's remote-subtitle API (needs the OpenSubtitles plugin).
- Progress reporting (start, periodic updates, stop) so resume works. Skip intro/outro buttons driven by media segments.
- **Auto-play the next episode** with an "Up next" countdown. **Skip credits** jumps straight to the next episode.
- Done when: an episode with ASS subtitles plays, resumes where you stopped, offers skip intro, and skipping credits starts the next episode.

### Phase 3: Music

- Persistent queue, gapless playback where possible, playlists (view and edit), play-all and shuffle for an artist, album view.
- **Queue editing:** reorder, remove, play next, add to end, and clear.
- **Lyrics:** synced lyrics that highlight the current line, with a fallback to plain text.
- **Sleep timer:** a set number of minutes or end of track, applied to music, audiobooks and video alike.
- Media Session API for OS media keys.
- Done when: you can play an artist end to end, edit the queue, follow synced lyrics, and the queue survives a page reload.

### Phase 4: Go companion (roadmap Go Phase 1)

- HTTP service with token-passthrough middleware, SQLite, and a reading-position API.
- An aggregated "home" endpoint that fans out to Jellyfin with goroutines: continue watching, next up, recently added, and continue reading.
- `/metrics` in Prometheus format, structured logs, and rate limiting (gateway-capstone concepts).
- A job queue that Python workers pull from (the Distributed Task Queue concepts).
- Done when: the web app's home screen loads from the companion and falls back to direct Jellyfin calls when the companion is down.

### Phase 5: Books, comics, audiobooks

- foliate-js reader for EPUB, MOBI, and AZW3; pdf.js for PDF; cover art.
- Reader settings: font, size, theme, and paged vs. scroll mode.
- **Comics:** CBZ through foliate-js. CBR is a RAR archive and needs a separate decoder (a libarchive WASM build on web, or a Rust crate in Tauri). Check the current options before choosing. Add a comic view mode: fit width or height, two-page spreads, right-to-left for manga.
- **Audiobooks:** reuse the Phase 3 audio engine, adding a chapter list, chapter skip, ±30 s jumps, speed control, and resume through the normal Jellyfin progress reporting.
- Positions saved to the companion and percentage mirrored to Jellyfin.
- Done when: you can open each book and comic format and it reopens at the exact spot, and an audiobook resumes mid-chapter.

### Phase 6: Cross-cutting user state

- Mark watched/read/played, favorite, and unmark on every item type, from both list and detail views.
- **Home rows:** Continue Watching, Next Up, Recently Added (per library), Continue Reading, Continue Listening, and Favorites.
- Done when: state set on web shows up in the official Jellyfin app, and the home rows update right after it changes.

### Phase 7: Tauri desktop (roadmap Rust Phase 2)

- Wrap the web app in Tauri 2. Write Rust plugins for OS keyring token storage, MPRIS media controls, and an offline download manager (concurrent downloads, resume, checksums).
- **Offline downloads** for video (at a chosen transcode quality), music (albums and playlists), books, comics and audiobooks. Show storage used and allow deleting downloads.
- **Offline progress sync:** while offline, write progress, played and favorite changes to a local outbox. Replay it on reconnect, with the newest timestamp winning on conflicts. The web build gets a lighter offline mode later, or none.
- Package as Flatpak or AppImage.
- Done when: the desktop build plays video and music, downloaded items play with the network off, and progress made offline appears on the server after reconnecting.

### Phase 8: Android

- Tauri Android build, a touch-friendly responsive layout, a background-audio notification, and downloads.
- Done when: a signed APK installs on your phone and music keeps playing with the screen locked.

### Phase 9: Fire TV

- Target device: Insignia 43" F50 (Fire OS). Enable Developer Options and ADB debugging on the TV, then sideload over ADB on your LAN.
- Leanback launcher entry, a 10-foot UI, D-pad spatial focus navigation (a focus-management layer in TS), and remote play/pause/seek keys.
- Quick Connect as the default TV login.
- Device profile tuned to what the TV actually reports. The panel is 4K, but test HEVC, HDR, and the audio codecs before allowing direct play.
- Done when: the remote alone can browse, play, seek, and skip intro.

### Phase 10: Python workers (roadmap Python Phase 4)

- Intro/outro detector using audio fingerprinting across the episodes of a season. Results are posted as segments to the companion and used only when the server has no segments for that item.
- A stats/recommendations worker that produces a "Wrapped"-style summary.
- A dev seeding script for the test server.
- Done when: an episode without server segments still shows skip intro.

### Phase 11: SyncPlay (watch together)

- Join or create SyncPlay groups through the Jellyfin API. Listen to the server's WebSocket for group commands, and keep play, pause, and seek in sync with drift correction.
- Must work with the official Jellyfin clients in the same group.
- Done when: the web app and the official Android or web client stay in sync through pause, seek, and buffering.

### Phase 12: Hardening

- Tests: unit tests per language, plus Playwright end-to-end tests against the Podman Jellyfin.
- CI with Forgejo or GitHub Actions.
- Error and offline states, accessibility pass, release builds.

## Feature scope (all in)

| Feature                                                             | Phase   |
| ------------------------------------------------------------------- | ------- |
| Video playback, ASS subtitles, trickplay, seeking, skip intro/outro | 2       |
| Audio/subtitle track and quality selection, playback speed          | 2       |
| Subtitle styling, external subtitle search                          | 2       |
| Auto-play next episode, skip credits to next                        | 2       |
| Music: streaming, playlists, play-all for an artist                 | 3       |
| Queue editing, lyrics, sleep timer                                  | 3       |
| Books (EPUB, PDF, MOBI, AZW3), cover art                            | 5       |
| Comics (CBZ, CBR)                                                   | 5       |
| Audiobooks with chapters                                            | 5       |
| Resume everywhere                                                   | 2, 3, 5 |
| Mark watched/read/favorite, home rows                               | 6       |
| Search, Quick Connect, multiple users/servers, parental controls    | 1       |
| OS media controls (Media Session, MPRIS, Android notification)      | 3, 7, 8 |
| Offline downloads plus offline progress sync                        | 7, 8    |
| SyncPlay                                                            | 11      |

## Progress

- Current phase: **1: TS core (web)**. Next: persist the `Session` so a reload stays logged in. `apps/tauri` can wait for Phase 7.
- Phase 1: **TS core (web)** (started 2026-11-08)
  - Done (2026-11-08): `@jellyfin/sdk` 1.0.2 and axios added to `packages/core`. `login(url, username, password)` maps `AuthenticationResult` to a domain `Session` (`serverUrl`, `serverId`, `userId`, `userName`, `accessToken`) and throws if a field is missing. It type-checks. A wrong password returns HTTP 401 on 12.4, although the spec only lists 200 and 503.
  - Done (2026-11-08): `login` takes an options object with `deviceId` and `deviceName` supplied by the app. Token test on 12.4 with one shared device ID (via `curl`, same login request as the SDK): logging in again as the same user revoked that user's earlier token (401), and another user's token on that device ID stayed valid (200). One device ID per install works for user switching, and the session store must replace a user's token on re-login. Not tested: whether re-login ends another user's live playback session on the same device ID (the source suggests it might), so recheck in Phase 2.
  - Done (2026-11-08): `login` returns a `LoginResult` discriminated union (`invalid-credentials`, `unreachable`, `server-error`, `invalid-response`) so the UI never sees Axios errors. `apps/web` has a `LoginForm` and `getDeviceId()` (one UUID per browser, in `localStorage`). Checked in the browser: correct login for both users, wrong password, and an unreachable server each show the right result.
  - Later: a server URL with no `http://` shows a misleading `server-error`. The form still shows raw reason strings and is unstyled.
  - SDK imports: API helpers aren't reachable from the package entry point, so import them by path (`@jellyfin/sdk/lib/utils/api/authentication-api`). Editor auto-import doesn't find them until one is imported.
- Phase 0: **Workspace and tooling** (server setup complete 2026-11-08)
  - Done: git repo; toolchains pinned (`mise.toml`, `rust-toolchain.toml` with Android targets, pnpm via `packageManager`); dev Jellyfin running in Podman (`docs/podman-run.txt`), setup wizard complete.
  - Done (2026-11-01): pnpm workspace; `apps/web` (Vite react-ts, TS 7) builds; `packages/core` linked via `workspace:*` and imported by web; oxlint at the root with React rules scoped to `apps/web/**`.
  - Done (2026-11-01): `packages/core` standalone type-check (`pnpm -F @tidepool/core typecheck`); project named Tidepool, remote `github.com/anthony81799/tidepool` (public, GPL-3.0, default branch `main`); `services/companion` Go module (`github.com/anthony81799/tidepool/services/companion`, Go 1.27.3) builds and vets clean, with the binary ignored at `/services/companion/companion`; `workers/` uv package (`src/` layout, `uv run workers` works, `__pycache__/` ignored).
  - Done (2026-11-02): root `justfile` with `jellyfin`, `dev`, `lint`, `test` (tools run per package via `pnpm -F`, `go -C`, `uv run --directory`); workers dev deps ruff + pytest and a smoke test. `just dev` brings up Jellyfin and Vite, which meets Phase 0's done condition.
  - Done (2026-11-07): oxlint pinned to exactly `1.92.0`; oxfmt `0.77.0` (beta, exact pin, defaults, `.oxfmtrc.json`) formats TS/JSON/CSS/YAML/TOML/Markdown, and the repo is formatted. `just fmt-check` runs `gofmt -l` in a shebang recipe so gofmt errors fail it, plus `just --fmt --check`, `pnpm fmt --check`, and `ruff format --check` (moved out of `lint`).
  - Done (2026-11-07): `.githooks/pre-commit` runs `just fmt-check` on staged content only (`stash push --keep-index --include-untracked`; an EXIT trap runs `reset --hard` + `stash pop --index` only if the hook created a stash). `just setup` sets `core.hooksPath`. Tested: a badly formatted staged file is blocked, and the index, working tree, untracked files, and existing stashes survive in all staging layouts. Format-on-save in the editor can fix files before the hook sees them, so test with edits made outside the editor.
  - Done (2026-11-07): `tidepool.code-workspace` with five roots (`.`, `apps/web`, `packages/core`, `services/companion`, `workers`), format on save, and per-language formatters that match `just fmt-check`: Oxc (local oxfmt) for TS/JS/JSON/CSS/YAML/TOML/Markdown, gofmt via `golang.go`, Ruff, and rust-analyzer. Prettier and EditorConfig were dropped from the plan. Biome is disabled for the workspace (`biome.enabled: false`) because it conflicts with oxc and warns about the overlapping roots.
  - Done (2026-11-08): dev server moved to Jellyfin 12.4. Sample library in the git-ignored `dev/media`, copied from the real server: 16 items across Shows, Anime, Movies, Music, and Books, plus a CBZ built from the CBR's pages. Intro Skipper and Open Subtitles installed; `restricted` user capped at max rating 13 sees 10 of 16 items. Trickplay is enabled on the video libraries and stored outside the media folder, because `/media` is mounted read-only. Checked through the API and logs, not yet by playing anything in the web UI.
  - Skip-intro test media: The Irregular at Magic High School S03E11–13 has Intro and Outro segments. Stargate Origins S01E04–06 only has Outro segments.
- Dev server: **Jellyfin 12.4.0** (image tag `12.4`). OpenAPI spec at `/api-docs/openapi.json`, Swagger UI at `/api-docs/swagger/index.html`.
- Plugins for 12.x (checked 2026-11-08): Intro Skipper 12.0.6.0 (ABI 12.2) from `https://intro-skipper.org/manifest.json`, and OpenSubtitles 25 (ABI 12.0).
  - Use `http://127.0.0.1:8096`: `localhost` resolves to `::1` and the connection is reset (cause unconfirmed).
- Open checks: Fire OS version on the Insignia F50 (7 or 8), CBR decoder choice, Open Subtitles account credentials on the dev server
