jellyfin:
    podman run \
          --detach \
          --replace \
          --name jellyfin-dev \
          --publish 8096:8096/tcp \
          --publish 7359:7359/udp \
          --rm \
          --userns keep-id \
          --volume jellyfin-cache:/cache:Z \
          --volume jellyfin-config:/config:Z \
          --volume {{ justfile_directory() }}/dev/media:/media:ro,Z \
          docker.io/jellyfin/jellyfin:10.11

dev: jellyfin
    pnpm -F web dev

lint:
    pnpm lint
    go -C services/companion vet ./...
    uv run --directory workers ruff format --check
    uv run --directory workers ruff check

test:
    pnpm -F web build
    pnpm -F @tidepool/core typecheck
    go -C services/companion test ./...
    uv run --directory workers pytest
