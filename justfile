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
          docker.io/jellyfin/jellyfin:12.4

dev: jellyfin
    pnpm -F web dev

lint:
    pnpm lint
    go -C services/companion vet ./...
    uv run --directory workers ruff check

test:
    pnpm -F web build
    pnpm -F @tidepool/core typecheck
    go -C services/companion test ./...
    uv run --directory workers pytest

fmt-check-go:
    #!/usr/bin/env bash
    set -euo pipefail
    files=$(gofmt -l ./services/companion/)
    if [[ -n "$files" ]]; then
        echo "Unformatted files:" >&2
        echo "$files" >&2
        exit 1
    fi

fmt-check: fmt-check-go
    just --fmt --check
    pnpm fmt --check
    uv run --directory workers ruff format --check

setup:
    git config core.hooksPath .githooks

timer start=`date +%H:%M`:
    #!/usr/bin/env bash
    set -euo pipefail
    sound=/usr/share/sounds/freedesktop/stereo/alarm-clock-elapsed.oga
    warn=$(date -d "today {{ start }} 45 minutes" '+%F %T')
    end=$(date -d "today {{ start }} 60 minutes" '+%F %T')
    systemctl --user stop tidepool-warn.timer tidepool-end.timer 2>/dev/null || true
    systemd-run --user --quiet --unit=tidepool-warn --on-calendar="$warn" --timer-property=AccuracySec=1s \
        sh -c "notify-send -u critical 'Tidepool' '15 minutes left (ends ${end:11:5})'; paplay $sound"
    systemd-run --user --quiet --unit=tidepool-end --on-calendar="$end" --timer-property=AccuracySec=1s \
        sh -c "notify-send -u critical 'Tidepool' 'HOUR IS UP'; for i in 1 2 3; do paplay $sound; done"
    echo "Started {{ start }}. Warning at ${warn:11:5}, alarm at ${end:11:5}."

timer-stop:
    systemctl --user stop tidepool-warn.timer tidepool-end.timer
