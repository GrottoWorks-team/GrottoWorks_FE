#!/usr/bin/env bash
# Dựng Postgres cục bộ + chạy 3 service BE cho E2E.
# Docker Desktop không có trên máy này → dùng initdb của PostgreSQL 18 native.
# Trust auth, cổng 55432 để không đụng cụm 5432 sẵn có của máy.
set -euo pipefail

PG="/c/Program Files/PostgreSQL/18/bin"
PGDATA="D:/khoa/tmp/pgdata"
PGLOG="D:/khoa/tmp/pg.log"
PGPORT=55432
JWT="grottoworks-local-dev-signing-key-min-32-chars-long"
BE="D:/khoa/GrottoWorks_BE"

start_pg() {
  if "$PG/pg_ctl.exe" -D "$PGDATA" status >/dev/null 2>&1; then
    echo "[pg] đã chạy"; return
  fi
  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    mkdir -p "D:/khoa/tmp"
    "$PG/initdb.exe" -D "$PGDATA" -U postgres -A trust -E UTF8 >/dev/null
  fi
  "$PG/pg_ctl.exe" -D "$PGDATA" -o "-p $PGPORT" -l "$PGLOG" start
  sleep 3
}

start_pg

"$PG/psql.exe" -h localhost -p $PGPORT -U postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='identity_db'" | grep -q 1 \
  || "$PG/psql.exe" -h localhost -p $PGPORT -U postgres -c "CREATE DATABASE identity_db"
"$PG/psql.exe" -h localhost -p $PGPORT -U postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='parish_db'" | grep -q 1 \
  || "$PG/psql.exe" -h localhost -p $PGPORT -U postgres -c "CREATE DATABASE parish_db"

export Jwt__SigningKey="$JWT"
export ASPNETCORE_ENVIRONMENT=Development

(cd "$BE/Services/Identity/Identity.Api" && \
  ConnectionStrings__IdentityDatabase="Host=localhost;Port=$PGPORT;Database=identity_db;Username=postgres;Password=postgres" \
  Seed__AdminPassword="ChangeMe!123456" \
  Seed__AdminEmail="admin@grottoworks.local" \
  dotnet run --no-launch-profile --urls http://localhost:5180 > "D:/khoa/tmp/identity.log" 2>&1) &

(cd "$BE/Services/ParishCoordination/ParishCoordination.Api" && \
  ConnectionStrings__ParishCoordinationDatabase="Host=localhost;Port=$PGPORT;Database=parish_db;Username=postgres;Password=postgres" \
  dotnet run --no-launch-profile --urls http://localhost:5178 > "D:/khoa/tmp/parish.log" 2>&1) &

echo "[be] đợi 2 service migrate + seed…"
for i in {1..40}; do
  if curl -s http://localhost:5180/health/ready >/dev/null 2>&1 && curl -s http://localhost:5178/health/ready >/dev/null 2>&1; then
    echo "[be] 2 service đã sẵn sàng"
    break
  fi
  sleep 2
done

(cd "$BE/ApiGateway/YarpApiGateway" && \
  ReverseProxy__Clusters__identity__Destinations__destination1__Address="http://localhost:5180/" \
  ReverseProxy__Clusters__parish__Destinations__destination1__Address="http://localhost:5178/" \
  dotnet run --no-launch-profile --urls http://localhost:5190 > "D:/khoa/tmp/gateway.log" 2>&1) &

for i in {1..30}; do
  if curl -s http://localhost:5190/api/v1/seasons >/dev/null 2>&1; then
    echo "[be] gateway đã sẵn sàng"
    break
  fi
  sleep 2
done

echo "[be] xong. Log: D:/khoa/tmp/{identity,parish,gateway}.log"
wait
