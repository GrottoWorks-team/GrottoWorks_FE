#!/usr/bin/env bash
# Dựng Postgres cục bộ + chạy 4 service BE + Gateway cho E2E.
set -euo pipefail

PG="/c/Program Files/PostgreSQL/18/bin"
PGDATA="D:/khoa/tmp/pgdata"
PGLOG="D:/khoa/tmp/pg.log"
PGPORT=55432
JWT="grottoworks-local-dev-signing-key-min-32-chars-long"
INTERNAL_KEY="dev-internal-api-key-change-me-0123456789"
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

"$PG/psql.exe" -h 127.0.0.1 -p $PGPORT -U postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='identity_db'" | grep -q 1 \
  || "$PG/psql.exe" -h 127.0.0.1 -p $PGPORT -U postgres -c "CREATE DATABASE identity_db"
"$PG/psql.exe" -h 127.0.0.1 -p $PGPORT -U postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='parish_db'" | grep -q 1 \
  || "$PG/psql.exe" -h 127.0.0.1 -p $PGPORT -U postgres -c "CREATE DATABASE parish_db"
"$PG/psql.exe" -h 127.0.0.1 -p $PGPORT -U postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='resource_db'" | grep -q 1 \
  || "$PG/psql.exe" -h 127.0.0.1 -p $PGPORT -U postgres -c "CREATE DATABASE resource_db"
"$PG/psql.exe" -h 127.0.0.1 -p $PGPORT -U postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='task_db'" | grep -q 1 \
  || "$PG/psql.exe" -h 127.0.0.1 -p $PGPORT -U postgres -c "CREATE DATABASE task_db"

export Jwt__SigningKey="$JWT"
export ASPNETCORE_ENVIRONMENT=Development
export DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1
export InternalApi__ApiKey="$INTERNAL_KEY"

# 1. Identity Service (:5180)
(cd "$BE/Services/Identity/Identity.Api" && \
  ConnectionStrings__IdentityDatabase="Host=127.0.0.1;Port=$PGPORT;Database=identity_db;Username=postgres;Password=postgres" \
  Seed__AdminPassword="ChangeMe!123456" \
  Seed__AdminEmail="admin@grottoworks.local" \
  dotnet run --no-launch-profile --urls http://localhost:5180 > "D:/khoa/tmp/identity.log" 2>&1) &

# 2. ParishCoordination Service (:5178)
(cd "$BE/Services/ParishCoordination/ParishCoordination.Api" && \
  ConnectionStrings__ParishCoordinationDatabase="Host=127.0.0.1;Port=$PGPORT;Database=parish_db;Username=postgres;Password=postgres" \
  IdentityClient__BaseAddress="http://localhost:5180/" \
  dotnet run --no-launch-profile --urls http://localhost:5178 > "D:/khoa/tmp/parish.log" 2>&1) &

# 3. Resource Service (:5183)
(cd "$BE/Services/Resource/Resource.Api" && \
  ConnectionStrings__ResourceDatabase="Host=127.0.0.1;Port=$PGPORT;Database=resource_db;Username=postgres;Password=postgres" \
  dotnet run --no-launch-profile --urls http://localhost:5183 > "D:/khoa/tmp/resource.log" 2>&1) &

# 4. TaskExecution Service (:5184)
(cd "$BE/Services/TaskExecution/TaskExecution.Api" && \
  ConnectionStrings__TaskExecutionDatabase="Host=127.0.0.1;Port=$PGPORT;Database=task_db;Username=postgres;Password=postgres" \
  dotnet run --no-launch-profile --urls http://localhost:5184 > "D:/khoa/tmp/task.log" 2>&1) &

echo "[be] đợi 4 service migrate + seed..."
for i in {1..50}; do
  if curl -s http://localhost:5180/health/ready >/dev/null 2>&1 && \
     curl -s http://localhost:5178/health/ready >/dev/null 2>&1 && \
     curl -s http://localhost:5183/health/ready >/dev/null 2>&1 && \
     curl -s http://localhost:5184/health/ready >/dev/null 2>&1; then
    echo "[be] 4 service đã sẵn sàng"
    break
  fi
  sleep 2
done

# 5. YarpApiGateway (:5190)
export ReverseProxy__Clusters__identity__Destinations__destination1__Address="http://localhost:5180/"
export ReverseProxy__Clusters__parish__Destinations__destination1__Address="http://localhost:5178/"
export ReverseProxy__Clusters__resource__Destinations__destination1__Address="http://localhost:5183/"
export ReverseProxy__Clusters__task__Destinations__destination1__Address="http://localhost:5184/"
export ReverseProxy__Routes__resource_purchase_requests_base_route__ClusterId="resource"
export ReverseProxy__Routes__resource_purchase_requests_base_route__AuthorizationPolicy="authenticated"
export ReverseProxy__Routes__resource_purchase_requests_base_route__Match__Path="/api/v1/purchase-requests"

(cd "$BE/ApiGateway/YarpApiGateway" && \
  dotnet run --no-launch-profile --urls http://localhost:5190 > "D:/khoa/tmp/gateway.log" 2>&1) &

for i in {1..30}; do
  if curl -s http://localhost:5190/api/v1/seasons >/dev/null 2>&1; then
    echo "[be] gateway đã sẵn sàng"
    break
  fi
  sleep 2
done

echo "[be] xong. Log: D:/khoa/tmp/{identity,parish,resource,task,gateway}.log"
wait
