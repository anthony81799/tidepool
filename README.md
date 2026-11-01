# Tidepool

A Jellyfin client for web, Linux desktop, Android, and Fire TV. Video, music, books, comics, and audiobooks in one app.

> **Status: early development (Phase 0, workspace and tooling).** Nothing is usable yet. See [docs/PLAN.md](docs/PLAN.md) for the roadmap and current progress.

Tidepool is an unofficial, independent client. It is not affiliated with or endorsed by the Jellyfin project.

## Goals

- **One UI everywhere.** A single React codebase ships as a web app and is wrapped in Tauri 2 for Linux, Android, and Fire TV.
- **Jellyfin is the source of truth.** Library, streams, progress, played state, and favorites live on your server, so they stay in sync with the official clients.
- **Native-first.** Use what the server already provides (Media Segments for skip intro/outro, trickplay, Quick Connect, remote subtitles) before reimplementing it.
- **Works without extras.** An optional companion service adds features. If it's down, the app keeps working with fewer features.

## Planned features

| Area | Features |
|---|---|
| Accounts | Multiple servers and users, fast switching, Quick Connect, parental controls enforced by the server |
| Browse | Library browsing, item detail pages, artwork, search across all media types |
| Video | Direct play or HLS transcoding, ASS subtitles (JASSUB), trickplay thumbnails, audio/subtitle/quality selection, playback speed, subtitle styling, external subtitle search, skip intro/outro, auto-play next episode |
| Music | Persistent editable queue, playlists, play-all and shuffle by artist, synced lyrics, sleep timer, OS media keys |
| Books and comics | EPUB, MOBI, AZW3, FB2, CBZ (foliate-js), PDF (pdf.js), CBR, exact-position resume, reader themes and layouts, manga right-to-left |
| Audiobooks | Chapters, chapter skip, ±30 s jumps, speed control, resume |
| User state | Mark watched/read/played, favorites, home rows (Continue Watching, Next Up, Recently Added, Continue Reading, Continue Listening) |
| Desktop and mobile | OS keyring token storage, MPRIS and Android media notifications, offline downloads with offline progress sync |
| TV | 10-foot UI, D-pad focus navigation, remote control keys |
| Social | SyncPlay (watch together), compatible with official Jellyfin clients |

## Architecture

```
            ┌──────────────────────────────────────────┐
            │  UI: TypeScript + React (Vite)           │
            │  web build  │  Tauri 2 shell (Rust)      │
            │             │  Linux · Android · Fire TV │
            └──────┬───────────────────────┬───────────┘
   library, streams│                       │extras only
   progress, auth  │                       │(optional)
                   ▼                       ▼
         ┌──────────────────┐     ┌────────────────────┐
         │  Jellyfin server │◄────│  Companion (Go)    │
         │  (unchanged)     │     │  SQLite, job queue │
         └──────────────────┘     └─────────┬──────────┘
                                            │ jobs
                                            ▼
                                  ┌────────────────────┐
                                  │  Workers (Python)  │
                                  └────────────────────┘
```

- **Clients talk to Jellyfin directly** through the official [`@jellyfin/sdk`](https://github.com/jellyfin/jellyfin-sdk-typescript). Media is never proxied through the companion.
- **`packages/core`** holds the domain model (Item, Series/Season/Episode, Movie, Album/Artist/Track, Book, Comic, Audiobook, UserData). SDK responses are mapped into these types, so the UI never touches raw API objects.
- **The companion** validates each caller's Jellyfin token against the server and never stores passwords. It stores precise reading positions, aggregates the home feed, exposes Prometheus metrics, and dispatches jobs.
- **Workers** handle the optional extras: an intro/outro detection fallback (audio fingerprinting) for episodes the server has no segments for, plus watch and listen stats.

## Repository layout

| Path | Language | Contents |
|---|---|---|
| `apps/web` | TypeScript | React + Vite UI |
| `packages/core` | TypeScript | Shared domain model and API layer |
| `apps/tauri` | Rust | Tauri 2 shell and native plugins *(planned)* |
| `services/companion` | Go | Companion service *(skeleton)* |
| `workers/` | Python | Background workers, managed with `uv` *(planned)* |
| `docs/` | | Plan and dev notes |
| `dev/media` | | Local sample library for the dev server (git-ignored) |

## Development

### Prerequisites

- [mise](https://mise.jdx.dev/) installs the pinned toolchains (Node, pnpm, Go, Python, uv, just) from `mise.toml`.
- Rust is pinned in `rust-toolchain.toml`, with Android targets, and installed through rustup.
- [Podman](https://podman.io/) runs the dev Jellyfin server.

### Setup

```sh
mise install
pnpm install
```

### Dev Jellyfin server

The dev server runs Jellyfin 10.11 in Podman and mounts `dev/media` read-only. You can find the full command in [docs/podman-run.txt](docs/podman-run.txt). Once it's up:

- Web UI: <http://127.0.0.1:8096>
- OpenAPI spec: <http://127.0.0.1:8096/api-docs/openapi.json>

Use `127.0.0.1`, not `localhost`. On some setups `localhost` resolves to IPv6 and the connection is reset.

### Common commands

```sh
pnpm -F web dev                  # start the web app
pnpm -F web build                # type-check and build the web app
pnpm -F @tidepool/core typecheck # type-check the core package
pnpm lint                        # oxlint across the workspace
```

A `justfile` with `dev`, `test`, and `lint` targets for every language is planned.

## Known limitations

- **DRM-protected Kindle files (KFX, DRM AZW) cannot be supported.** Only DRM-free MOBI and AZW3 can be read.
- **Android and Fire TV codec support varies** by device WebView. The device profile favors server transcoding over direct play.
- **The web build has limited or no offline mode.** Downloads and offline progress sync are features of the Tauri builds.
- **Fire TV support targets Fire OS** (Android-based) devices only, installed by sideloading. Vega OS devices aren't supported.

## Server recommendations

- Jellyfin **10.11** or newer.
- The [Intro Skipper](https://github.com/intro-skipper/intro-skipper) plugin provides skip intro/outro segments.
- The OpenSubtitles plugin enables external subtitle search.
- Enable trickplay image extraction for seek previews.

## Roadmap

Development happens in phases, and each one ends with something that runs: workspace → core web client → video → music → companion → books and comics → user state → desktop → Android → Fire TV → workers → SyncPlay → hardening. See [docs/PLAN.md](docs/PLAN.md) for details.

## License

[GPL-3.0](LICENSE).
