#!/usr/bin/env bash
# Dựng Postgres cục bộ + chạy 4 service BE + Gateway cho E2E.
#
# Chạy được trên máy bất kỳ: tự dò PostgreSQL, tự suy thư mục BE từ vị trí
# script, không ghim ổ đĩa. Cần: .NET 10 SDK, PostgreSQL 16+, Git Bash.
#
#   bash scripts/be-local.sh
#
# Tuỳ chọn qua biến môi trường:
#   BE_DIR=<đường dẫn GrottoWorks_BE>   nếu repo BE không nằm cạnh repo FE
#   PG_BIN=<thư mục bin của PostgreSQL> nếu không dò được
set -euo pipefail

# ── 1. Suy đường dẫn từ chính vị trí script ──────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WORK_DIR="$FE_DIR/tmp"
BE="${BE_DIR:-$(cd "$FE_DIR/.." && pwd)/GrottoWorks_BE}"

# ── 2. Dò PostgreSQL ─────────────────────────────────────────────────────
find_pg() {
  [ -n "${PG_BIN:-}" ] && { echo "$PG_BIN"; return; }
  # Windows: C:/Program Files/PostgreSQL/<ver>/bin — chọn bản cao nhất
  local base
  for base in "/c/Program Files/PostgreSQL" "/c/Program Files (x86)/PostgreSQL"; do
    [ -d "$base" ] || continue
    local v
    v=$(ls -1 "$base" 2>/dev/null | grep -E '^[0-9]+$' | sort -rn | head -1)
    [ -n "$v" ] && { echo "$base/$v/bin"; return; }
  done
  # Linux/macOS hoặc PostgreSQL trong PATH
  if command -v pg_ctl >/dev/null 2>&1; then
    dirname "$(command -v pg_ctl)"; return
  fi
  return 1
}

if ! PG="$(find_pg)"; then
  cat >&2 <<'MSG'
[không tìm thấy PostgreSQL]
  Cài PostgreSQL 16 trở lên, hoặc trỏ thẳng tới thư mục bin:
    PG_BIN="/c/Program Files/PostgreSQL/18/bin" bash scripts/be-local.sh
MSG
  exit 1
fi

command -v dotnet >/dev/null 2>&1 || {
  echo "[thiếu .NET SDK] Cài .NET 10 SDK: https://dot.net" >&2; exit 1
}
[ -d "$BE" ] || {
  echo "[thiếu repo BE] Không thấy '$BE'" >&2
  echo "  Đặt GrottoWorks_BE cạnh GrottoWorks_FE, hoặc:" >&2
  echo "  BE_DIR=<đường dẫn> bash scripts/be-local.sh" >&2
  exit 1
}

PGDATA="$WORK_DIR/pgdata"
PGLOG="$WORK_DIR/pg.log"
PGPORT="${PGPORT:-55432}"
JWT="grottoworks-local-dev-signing-key-min-32-chars-long"
INTERNAL_KEY="dev-internal-api-key-change-me-0123456789"

mkdir -p "$WORK_DIR"

echo "[be] PostgreSQL: $PG"
echo "[be] BE repo   : $BE"
echo "[be] dữ liệu   : $PGDATA (cổng $PGPORT)"

start_pg() {
  if "$PG/pg_ctl.exe" -D "$PGDATA" status >/dev/null 2>&1; then
    echo "[pg] đã chạy"; return
  fi
  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    "$PG/initdb.exe" -D "$PGDATA" -U postgres -A trust -E UTF8 >/dev/null
  fi
  "$PG/pg_ctl.exe" -D "$PGDATA" -o "-p $PGPORT" -l "$PGLOG" start
  sleep 3
}

start_pg

for db in identity_db parish_db resource_db task_db; do
  "$PG/psql.exe" -h 127.0.0.1 -p "$PGPORT" -U postgres -tAc \
    "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1 \
    || "$PG/psql.exe" -h 127.0.0.1 -p "$PGPORT" -U postgres -c "CREATE DATABASE $db"
done

export Jwt__SigningKey="$JWT"
export ASPNETCORE_ENVIRONMENT=Development
export DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1
export InternalApi__ApiKey="$INTERNAL_KEY"

start_service() {
  local name="$1" dir="$2" url="$3"; shift 3
  ( cd "$BE/$dir" && env "$@" dotnet run --no-launch-profile --urls "$url" \
      > "$WORK_DIR/$name.log" 2>&1 ) &
  echo "[be] $name -> $url (log: $WORK_DIR/$name.log)"
}

start_service identity Services/Identity/Identity.Api http://localhost:5180 \
  "ConnectionStrings__IdentityDatabase=Host=127.0.0.1;Port=$PGPORT;Database=identity_db;Username=postgres;Password=postgres" \
  "Seed__AdminPassword=ChangeMe!123456" \
  "Seed__AdminEmail=admin@grottoworks.local"

start_service parish Services/ParishCoordination/ParishCoordination.Api http://localhost:5178 \
  "ConnectionStrings__ParishCoordinationDatabase=Host=127.0.0.1;Port=$PGPORT;Database=parish_db;Username=postgres;Password=postgres" \
  "IdentityClient__BaseAddress=http://localhost:5180/"

start_service resource Services/Resource/Resource.Api http://localhost:5183 \
  "ConnectionStrings__ResourceDatabase=Host=127.0.0.1;Port=$PGPORT;Database=resource_db;Username=postgres;Password=postgres"

start_service task Services/TaskExecution/TaskExecution.Api http://localhost:5184 \
  "ConnectionStrings__TaskExecutionDatabase=Host=127.0.0.1;Port=$PGPORT;Database=task_db;Username=postgres;Password=postgres"

echo "[be] đợi 4 service migrate + seed..."
for _ in $(seq 1 60); do
  ok=1
  for port in 5180 5178 5183 5184; do
    curl -s -o /dev/null "http://localhost:$port/health/ready" || ok=0
  done
  [ "$ok" = 1 ] && { echo "[be] 4 service đã sẵn sàng"; break; }
  sleep 2
done

start_service gateway ApiGateway/YarpApiGateway http://localhost:5190

for _ in $(seq 1 30); do
  curl -s -o /dev/null http://localhost:5190/api/v1/seasons && {
    echo "[be] gateway đã sẵn sàng"; break; }
  sleep 2
done

echo "[be] xong. Log: $WORK_DIR/{identity,parish,resource,task,gateway}.log"
echo "[be] Frontend: cd \"$FE_DIR\" && npm run dev   (đã có .env.local trỏ 5190)"
wait
