#!/usr/bin/env bash
# scripts/seed-demo.sh
# Khoi tao du lieu mau cho 4 service BE va Gateway 5190 (idempotent)
set -euo pipefail

GATEWAY="http://localhost:5190"
RESOURCE="http://localhost:5183"
TASK="http://localhost:5184"
INTERNAL_KEY="dev-internal-api-key-change-me-0123456789"

echo "==> Dang dang nhap admin..."
ADMIN_LOGIN=$(curl -s -X POST "$GATEWAY/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@grottoworks.local","password":"ChangeMe!123456"}')

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
if [ -z "$ADMIN_TOKEN" ]; then
  echo "Loi dang nhap admin"
  exit 1
fi
echo "==> Admin token OK"

# 1. Tao Leader & MO neu chua co
echo "==> Tao hoac kiem tra Leader & MO..."
curl -s -X POST "$GATEWAY/api/v1/admin/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Truong Ban Thi Cong","email":"leader.demo@grottoworks.local","password":"ChangeMe!123456","role":"LEADER","communityId":"22222222-2222-2222-2222-222222222222"}' >/dev/null 2>&1 || true

curl -s -X POST "$GATEWAY/api/v1/admin/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Phu Trach Vat Tu","email":"mo.demo@grottoworks.local","password":"ChangeMe!123456","role":"MO","communityId":"22222222-2222-2222-2222-222222222222"}' >/dev/null 2>&1 || true

# Lay user ID
USERS_JSON=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$GATEWAY/api/v1/admin/users?size=100")
LEADER_ID=$(echo "$USERS_JSON" | grep -o '{"id":"[^"]*","fullName":"[^"]*","email":"leader.demo@grottoworks.local"' | grep -o '{"id":"[^"]*' | cut -d'"' -f4 || echo "1dca571b-6c19-4184-a07e-d87f29617741")
MO_ID=$(echo "$USERS_JSON" | grep -o '{"id":"[^"]*","fullName":"[^"]*","email":"mo.demo@grottoworks.local"' | grep -o '{"id":"[^"]*' | cut -d'"' -f4 || echo "341a5b21-c9cb-4ab3-8424-8430fdb3db27")

echo "LEADER_ID: $LEADER_ID, MO_ID: $MO_ID"

# 2. Gan Leader & MO vao WorkArea va Kich hoat Season (neu can)
echo "==> Gan leader & MO vao work area..."
curl -s -X PUT "$GATEWAY/api/v1/work-areas/66666666-6666-6666-6666-666666666666/leader" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"leaderUserId\":\"$LEADER_ID\"}" >/dev/null 2>&1 || true

curl -s -X PUT "$GATEWAY/api/v1/work-areas/66666666-6666-6666-6666-666666666666/material-officer" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"materialOfficerUserId\":\"$MO_ID\"}" >/dev/null 2>&1 || true

# Kich hoat season 4444...
SEASON_INFO=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$GATEWAY/api/v1/seasons")
SEASON_VER=$(echo "$SEASON_INFO" | grep -o '"id":"44444444-4444-4444-4444-444444444444"[^}]*' | grep -o '"version":[0-9]*' | cut -d':' -f2 || echo "1")
curl -s -X POST "$GATEWAY/api/v1/seasons/44444444-4444-4444-4444-444444444444/activate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"version\":$SEASON_VER}" >/dev/null 2>&1 || true

# 3. Day Scope vao Resource & TaskExecution
echo "==> Day projection scope vao Resource & TaskExecution..."
curl -s -X PUT "$RESOURCE/internal/work-area-scopes/66666666-6666-6666-6666-666666666666" \
  -H "X-Internal-Api-Key: $INTERNAL_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"seasonId\":\"44444444-4444-4444-4444-444444444444\",\"parishId\":\"11111111-1111-1111-1111-111111111111\",\"name\":\"Khu Hang Da 1\",\"status\":\"Planned\",\"seasonStatus\":\"Active\",\"communityId\":\"22222222-2222-2222-2222-222222222222\",\"leaderUserId\":\"$LEADER_ID\",\"materialOfficerUserId\":\"$MO_ID\",\"version\":10}" >/dev/null 2>&1 || true

curl -s -X PUT "$TASK/internal/season-scopes/44444444-4444-4444-4444-444444444444" \
  -H "X-Internal-Api-Key: $INTERNAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"parishId":"11111111-1111-1111-1111-111111111111","startDate":"2026-10-01","endDate":"2027-01-15","status":"Active","version":10}' >/dev/null 2>&1 || true

curl -s -X PUT "$TASK/internal/work-area-scopes/66666666-6666-6666-6666-666666666666" \
  -H "X-Internal-Api-Key: $INTERNAL_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"seasonId\":\"44444444-4444-4444-4444-444444444444\",\"parishId\":\"11111111-1111-1111-1111-111111111111\",\"name\":\"Khu Hang Da 1\",\"communityId\":\"22222222-2222-2222-2222-222222222222\",\"leaderUserId\":\"$LEADER_ID\",\"materialOfficerUserId\":\"$MO_ID\",\"startDate\":\"2026-10-01\",\"deadline\":\"2026-12-24\",\"status\":\"Planned\",\"version\":10}" >/dev/null 2>&1 || true

# 4. Dang nhap MO de tao danh muc & vat tu & ton kho
echo "==> Dang nhap MO..."
MO_LOGIN=$(curl -s -X POST "$GATEWAY/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"mo.demo@grottoworks.local","password":"ChangeMe!123456"}')
MO_TOKEN=$(echo "$MO_LOGIN" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# Tao categories
echo "==> Tao danh muc vat tu..."
for cat in "LIGHTING:Den va chieu sang" "TIMBER:Go va vat lieu dung" "HARDWARE:Phu kien kim khi" "STATUE:Tuong va tieu canh" "PAINT:Son va mau ve"; do
  code="${cat%%:*}"
  name="${cat##*:}"
  curl -s -X POST "$GATEWAY/api/v1/material-categories" \
    -H "Authorization: Bearer $MO_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"code\":\"$code\",\"name\":\"$name\"}" >/dev/null 2>&1 || true
done

# Lay category ID cua LIGHTING
CATS_JSON=$(curl -s -H "Authorization: Bearer $MO_TOKEN" "$GATEWAY/api/v1/material-categories")
LIGHTING_ID=$(echo "$CATS_JSON" | grep -o '{"id":"[^"]*","code":"LIGHTING"' | cut -d'"' -f4 || true)

if [ -n "$LIGHTING_ID" ]; then
  # Tao vat tu
  echo "==> Tao vat tu mau..."
  MAT_RES=$(curl -s -X POST "$GATEWAY/api/v1/materials" \
    -H "Authorization: Bearer $MO_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"categoryId\":\"$LIGHTING_ID\",\"code\":\"LED-WARM-10M\",\"name\":\"Day LED vang 10m\",\"unit\":\"cuon\"}")
  MAT_ID=$(echo "$MAT_RES" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4 || true)
  if [ -z "$MAT_ID" ]; then
    MATS_JSON=$(curl -s -H "Authorization: Bearer $MO_TOKEN" "$GATEWAY/api/v1/materials?size=50")
    MAT_ID=$(echo "$MATS_JSON" | grep -o '{"id":"[^"]*","categoryId":"[^"]*","code":"LED-WARM-10M"' | cut -d'"' -f4 || true)
  fi

  if [ -n "$MAT_ID" ]; then
    echo "==> Nhap ton kho dau ky..."
    curl -s -X POST "$GATEWAY/api/v1/inventory/opening-stock" \
      -H "Authorization: Bearer $MO_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"workAreaId\":\"66666666-6666-6666-6666-666666666666\",\"materialId\":\"$MAT_ID\",\"quantity\":10,\"note\":\"Ton kho dau ky seed\"}" >/dev/null 2>&1 || true

    echo "==> Tao dinh muc vat tu..."
    curl -s -X POST "$GATEWAY/api/v1/work-areas/66666666-6666-6666-6666-666666666666/material-requirements" \
      -H "Authorization: Bearer $MO_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"materialId\":\"$MAT_ID\",\"requiredQuantity\":25,\"note\":\"Dinh muc trang tri hang da\"}" >/dev/null 2>&1 || true

    echo "==> Tao purchase request mau..."
    curl -s -X POST "$GATEWAY/api/v1/purchase-requests" \
      -H "Authorization: Bearer $MO_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"workAreaId\":\"66666666-6666-6666-6666-666666666666\",\"reason\":\"De xuat mua bo sung day LED\",\"items\":[{\"materialId\":\"$MAT_ID\",\"requestedQuantity\":15,\"estimatedCost\":750000}]}" >/dev/null 2>&1 || true
  fi
fi

# 5. Dang nhap Leader de tao task mau
echo "==> Dang nhap Leader..."
LEADER_LOGIN=$(curl -s -X POST "$GATEWAY/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"leader.demo@grottoworks.local","password":"ChangeMe!123456"}')
LEADER_TOKEN=$(echo "$LEADER_LOGIN" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo "==> Tao cac task thi cong mau..."
curl -s -X POST "$GATEWAY/api/v1/work-areas/66666666-6666-6666-6666-666666666666/tasks" \
  -H "Authorization: Bearer $LEADER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Dung bo khung sat chiu luc","description":"Han va co dinh khung sat hang da","priority":"Critical","estimatedMinutes":360,"requiredVolunteers":6,"startAt":"2026-10-22T08:00:00Z","deadline":"2026-10-22T17:00:00Z"}' >/dev/null 2>&1 || true

curl -s -X POST "$GATEWAY/api/v1/work-areas/66666666-6666-6666-6666-666666666666/tasks" \
  -H "Authorization: Bearer $LEADER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Boc giay xi mang tao hinh vach da","description":"Boc va boi ho tao van khoi da","priority":"High","estimatedMinutes":240,"requiredVolunteers":4,"startAt":"2026-10-23T08:00:00Z","deadline":"2026-10-23T17:00:00Z"}' >/dev/null 2>&1 || true

curl -s -X POST "$GATEWAY/api/v1/work-areas/66666666-6666-6666-6666-666666666666/tasks" \
  -H "Authorization: Bearer $LEADER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Lap dat he thong den chieu sang","description":"Cang day LED vang va lap den pha","priority":"Medium","estimatedMinutes":180,"requiredVolunteers":3,"startAt":"2026-10-24T08:00:00Z","deadline":"2026-10-24T17:00:00Z"}' >/dev/null 2>&1 || true

echo "==> Seed thanh cong toan bo du lieu mau!"
