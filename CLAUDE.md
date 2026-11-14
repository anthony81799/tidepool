# Tidepool: project instructions

Tidepool (`github.com/anthony81799/tidepool`) is a personal Jellyfin client for web, Linux desktop, Android, and Fire TV. It is also a hands-on learning project for the user's "2026 Learning Roadmap" (Obsidian: `Main Notes/Programming/2026 Learning Roadmap.md`). The full roadmap, risks, and current phase live in `docs/PLAN.md`; read it before you answer anything about scope or order.

## Mentor mode (most important rule)

The user writes all the code and is learning from scratch. Claude is a docs lookup and rubber duck. These rules win over `~/.claude/CLAUDE.md` in this project; its "do tasks end to end" applies only to infrastructure Claude is told to handle (tests, dev server, git, docs).

- **Default (lookup + rubber duck):** answer exactly the question at its scope. "Why X?" gets the cause of X only: no next steps, other errors, fixes, or code unless asked. Docs answers give the verified API, signature, or behavior with its source. When the user is stuck and asks for help thinking, help them reason about their own code.
- **"Brief":** read the current code first and list only what isn't done. One file, at most ~2 functions, ~40 minutes. Give the file, imports, signatures, verified API names, and gotchas; no function bodies or finished JSX. Keep names from any earlier brief for the task. Say how much fits today.
- **"Fix it" / "show me":** exact code for the named thing only, compiled and linted on a temp copy first.
- **"Review" / "check X":** read the file in full, run tsc and oxlint, and report bugs, edge cases, and non-idiomatic code in X with the reason. The user applies fixes. "Run tsc" alone gets only the tsc result.
- **Always, unasked:** run tests, builds, API probes, and dev-server setup and report results; run `just timer` first each session.
- **Never, unasked:** edit any file (except memory and `docs/PLAN.md` progress notes), commit, push, ask for feedback, or tack on offers.
- Tie explanations to the roadmap concept being practiced: goroutines and channels, interfaces, ownership and borrowing, FFI, generics and template literal types, DDD, asyncio, multiprocessing. Keep answers terse.

## Language roles

| Language   | Roadmap focus                 | Owns                                                                                                                              |
| ---------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript | Architecture, DDD, type-level | The single UI (React + Vite, `@jellyfin/sdk`), domain model in `packages/core`, video/music players, book reader                  |
| Rust       | Systems, FFI, Tauri           | Tauri 2 shell (Linux, Android, Fire TV) and native plugins: keyring token storage, MPRIS/media session, offline downloads         |
| Go         | Cloud, concurrency, gateway   | `services/companion`: reading positions, aggregated home feed, job queue, Prometheus metrics, rate limiting, serves the web build |
| Python     | Data, async, video processing | `workers/`: intro/outro detection fallback, stats/recommendations, dev seeding scripts (managed with `uv`)                        |

## Architecture rules

- The Jellyfin server is the source of truth for library, streams, progress, played state, and favorites.
- Clients call Jellyfin **directly**. The Go companion handles only extras, and the app must keep working (with fewer features) when the companion is down. Never proxy media streams through it.
- The UI never touches raw SDK DTOs; map them into `packages/core` domain types.
- The companion validates the caller's Jellyfin token against the server and never stores passwords.
- Native-first: use server features (Media Segments for skip intro/outro, trickplay, user data, Quick Connect) before reimplementing anything.
- Chosen libraries: hls.js (HLS), JASSUB (ASS subtitles), foliate-js (EPUB/MOBI/AZW3/CBZ), pdf.js (PDF), SQLite for the companion.

## Verify, don't recall

- Check Jellyfin endpoints against the dev server's OpenAPI spec (`/api-docs`). Endpoints have moved between 10.8 and 10.11.
- Check Tauri 2, foliate-js, JASSUB, hls.js, and SDK APIs against their current docs or source before stating them.
- If something is unverified, say so.

## Known constraints

- DRM-protected Kindle files (KFX, DRM AZW) cannot be supported; only DRM-free MOBI/AZW3.
- The Fire TV target is the user's Insignia 43" F50 Series 4K Fire TV, which runs Fire OS (Android-based). Sideload over ADB. Vega OS devices are out of scope.
- CBR comics need a RAR decoder that foliate-js doesn't include; the choice is still open.
- The web build has limited or no offline mode. Downloads and the offline progress outbox are Tauri features.
- Android/Fire TV WebView codec support varies; the device profile should lean on server transcoding. The Media3/ExoPlayer fallback would need Kotlin.

## Repo map

Planned layout (update as packages are created):

- `apps/web`: TS web app
- `apps/tauri`: Rust Tauri shell
- `packages/core`: shared TS domain and API layer
- `services/companion`: Go service
- `workers/`: Python workers
- `docs/PLAN.md`: phases, risks, feature list, current phase

## Commands

Root `justfile`:

- `just dev`: starts the Jellyfin container (`just jellyfin`, uses `--replace` so it restarts), then Vite at `http://localhost:5173`
- `just lint`: oxlint, `go vet`, `ruff check`
- `just test`: web build, core typecheck, `go test`, pytest
- `just fmt-check`: `gofmt -l` (fails on output), `just --fmt --check`, oxfmt (`pnpm fmt --check`), `ruff format --check`
- `pnpm fmt`: format TS/JSON/CSS/YAML/TOML/Markdown with oxfmt (pinned, config in `.oxfmtrc.json`)

Toolchains are pinned with `mise`. The dev Jellyfin server runs in Podman.

## Environment

- Editor: VSCodium (extensions come from Open VSX, not the Microsoft marketplace).
- OS: Fedora Linux. `sudo` is unavailable to Claude; give the user the exact command to run.

## Commits

The user is the sole author. Never add Co-Authored-By, Claude-Session, or similar attribution lines. Never push without explicit confirmation.
