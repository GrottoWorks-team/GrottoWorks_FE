# Dựng Postgres cục bộ + chạy 7 service BE + Gateway cho E2E — bản PowerShell.
#
# Không cần Git Bash. Chạy trong PowerShell tại thư mục repo FE:
#
#   powershell -ExecutionPolicy Bypass -File scripts\be-local.ps1
#
# Tuỳ chọn:
#   -BeDir  <đường dẫn GrottoWorks_BE>   nếu repo BE không nằm cạnh repo FE
#   -PgBin  <thư mục bin của PostgreSQL> nếu không dò được
#   -PgPort <cổng Postgres>              mặc định 55432
#
# Cần: .NET 10 SDK, PostgreSQL 16+.

[CmdletBinding()]
param(
    [string]$BeDir,
    [string]$PgBin,
    [int]$PgPort = 55432
)

$ErrorActionPreference = 'Stop'

# ── 1. Suy đường dẫn từ chính vị trí script ──────────────────────────────
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FeDir     = Split-Path -Parent $ScriptDir
$WorkDir   = Join-Path $FeDir 'tmp'
if (-not $BeDir) { $BeDir = Join-Path (Split-Path -Parent $FeDir) 'GrottoWorks_BE' }

# ── 2. Dò PostgreSQL ─────────────────────────────────────────────────────
function Find-PgBin {
    param([string]$Hint)
    if ($Hint) { return $Hint }
    foreach ($base in @('C:\Program Files\PostgreSQL', 'C:\Program Files (x86)\PostgreSQL')) {
        if (-not (Test-Path $base)) { continue }
        $ver = Get-ChildItem $base -Directory -ErrorAction SilentlyContinue |
               Where-Object { $_.Name -match '^\d+$' } |
               Sort-Object { [int]$_.Name } -Descending |
               Select-Object -First 1
        if ($ver) {
            $candidate = Join-Path $ver.FullName 'bin'
            if (Test-Path (Join-Path $candidate 'pg_ctl.exe')) { return $candidate }
        }
    }
    $cmd = Get-Command pg_ctl.exe -ErrorAction SilentlyContinue
    if ($cmd) { return (Split-Path -Parent $cmd.Source) }
    return $null
}

$Pg = Find-PgBin -Hint $PgBin
if (-not $Pg) {
    Write-Host '[không tìm thấy PostgreSQL]' -ForegroundColor Red
    Write-Host '  Cài PostgreSQL 16 trở lên, hoặc trỏ thẳng tới thư mục bin:'
    Write-Host '    powershell -File scripts\be-local.ps1 -PgBin "C:\Program Files\PostgreSQL\18\bin"'
    exit 1
}

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-Host '[thiếu .NET SDK] Cài .NET 10 SDK: https://dot.net' -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $BeDir)) {
    Write-Host "[thiếu repo BE] Không thấy '$BeDir'" -ForegroundColor Red
    Write-Host '  Đặt GrottoWorks_BE cạnh GrottoWorks_FE, hoặc:'
    Write-Host '  powershell -File scripts\be-local.ps1 -BeDir "D:\path\to\GrottoWorks_BE"'
    exit 1
}

$PgData = Join-Path $WorkDir 'pgdata'
$PgLog  = Join-Path $WorkDir 'pg.log'
$Jwt    = 'grottoworks-local-dev-signing-key-min-32-chars-long'
$InternalKey = 'dev-internal-api-key-change-me-0123456789'

New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null

Write-Host "[be] PostgreSQL: $Pg"
Write-Host "[be] BE repo   : $BeDir"
Write-Host "[be] dữ liệu   : $PgData (cổng $PgPort)"

# ── 3. Postgres ──────────────────────────────────────────────────────────
$pgCtl = Join-Path $Pg 'pg_ctl.exe'
$running = $false
try { & $pgCtl -D $PgData status *> $null; $running = ($LASTEXITCODE -eq 0) } catch { $running = $false }
if ($running) {
    Write-Host '[pg] đã chạy'
} else {
    if (-not (Test-Path (Join-Path $PgData 'PG_VERSION'))) {
        & (Join-Path $Pg 'initdb.exe') -D $PgData -U postgres -A trust -E UTF8 | Out-Null
    }
    & $pgCtl -D $PgData -o "-p $PgPort" -l $PgLog start
    Start-Sleep -Seconds 3
}

$psql = Join-Path $Pg 'psql.exe'
foreach ($db in 'identity_db', 'parish_db', 'resource_db', 'task_db', 'readiness_db', 'reporting_db', 'notify_db') {
    $exists = & $psql -h 127.0.0.1 -p $PgPort -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db'"
    if ($exists -notmatch '1') {
        & $psql -h 127.0.0.1 -p $PgPort -U postgres -c "CREATE DATABASE $db" | Out-Null
    }
}

# ── 4. Biến môi trường chung ────────────────────────────────────────────
$env:Jwt__SigningKey = $Jwt
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:DOTNET_SYSTEM_GLOBALIZATION_INVARIANT = '1'
$env:InternalApi__ApiKey = $InternalKey

function Start-Service1 {
    param([string]$Name, [string]$RelDir, [int]$Port, [hashtable]$Vars)
    foreach ($k in $Vars.Keys) { Set-Item -Path "Env:$k" -Value $Vars[$k] }
    $dir = Join-Path $BeDir $RelDir
    $log = Join-Path $WorkDir "$Name.log"
    Start-Process -FilePath 'dotnet' `
        -ArgumentList 'run', '--no-build', '--no-launch-profile', '--urls', "http://localhost:$Port" `
        -WorkingDirectory $dir -NoNewWindow `
        -RedirectStandardOutput $log -RedirectStandardError "$log.err" | Out-Null
    Write-Host "[be] $Name -> http://localhost:$Port (log: $log)"
    foreach ($k in $Vars.Keys) { Remove-Item -Path "Env:$k" -ErrorAction SilentlyContinue }
}

$conn = "Host=127.0.0.1;Port=$PgPort;Database={0};Username=postgres;Password=postgres"

# Build một lần cho cả solution: 7 service dùng chung BuildingBlocks.* nên build
# song song sẽ tranh ghi obj/*.dll (CS2012) và phần lớn tiến trình chết.
Write-Host '[be] build solution...'
Push-Location $BeDir
try {
    & dotnet build GrottoWorks_BE.slnx -v q --nologo
    if ($LASTEXITCODE -ne 0) { Write-Host '[be] build thất bại, dừng lại' -ForegroundColor Red; exit 1 }
} finally { Pop-Location }

Start-Service1 -Name 'identity' -RelDir 'Services\Identity\Identity.Api' -Port 5180 -Vars @{
    'ConnectionStrings__IdentityDatabase' = ($conn -f 'identity_db')
    'Seed__AdminPassword' = 'ChangeMe!123456'
    'Seed__AdminEmail'    = 'admin@grottoworks.local'
}
Start-Service1 -Name 'parish' -RelDir 'Services\ParishCoordination\ParishCoordination.Api' -Port 5178 -Vars @{
    'ConnectionStrings__ParishCoordinationDatabase' = ($conn -f 'parish_db')
    'IdentityClient__BaseAddress' = 'http://localhost:5180/'
}
Start-Service1 -Name 'resource' -RelDir 'Services\Resource\Resource.Api' -Port 5183 -Vars @{
    'ConnectionStrings__ResourceDatabase' = ($conn -f 'resource_db')
}
Start-Service1 -Name 'task' -RelDir 'Services\TaskExecution\TaskExecution.Api' -Port 5184 -Vars @{
    'ConnectionStrings__TaskExecutionDatabase' = ($conn -f 'task_db')
}
Start-Service1 -Name 'readiness' -RelDir 'Services\Readiness\Readiness.Api' -Port 5185 -Vars @{
    'ConnectionStrings__ReadinessDatabase' = ($conn -f 'readiness_db')
}
Start-Service1 -Name 'reporting' -RelDir 'Services\Reporting\Reporting.Api' -Port 5186 -Vars @{
    'ConnectionStrings__ReportingDatabase' = ($conn -f 'reporting_db')
    'IdentityClient__BaseAddress' = 'http://localhost:5180/'
}
Start-Service1 -Name 'notify' -RelDir 'Services\NotificationAudit\NotificationAudit.Api' -Port 5187 -Vars @{
    'ConnectionStrings__NotificationAuditDatabase' = ($conn -f 'notify_db')
}

function Test-Port {
    param([int]$Port, [int]$TimeoutMs = 1500)
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $task = $client.ConnectAsync('127.0.0.1', $Port)
        return $task.Wait($TimeoutMs) -and $client.Connected
    } catch { return $false } finally { $client.Dispose() }
}

Write-Host '[be] đợi 7 service migrate + seed...'
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    if ((Test-Port 5180) -and (Test-Port 5178) -and (Test-Port 5183) -and (Test-Port 5184) -and (Test-Port 5185) -and (Test-Port 5186) -and (Test-Port 5187)) {
        Write-Host '[be] 7 service đã sẵn sàng'; $ready = $true; break
    }
    Start-Sleep -Seconds 2
}
if (-not $ready) { Write-Host '[be] cảnh báo: chưa đủ 7 service, xem log trong tmp\' -ForegroundColor Yellow }

Start-Service1 -Name 'gateway' -RelDir 'ApiGateway\YarpApiGateway' -Port 5190 -Vars @{}

for ($i = 0; $i -lt 30; $i++) {
    if (Test-Port 5190) { Write-Host '[be] gateway đã sẵn sàng'; break }
    Start-Sleep -Seconds 2
}

Write-Host "[be] xong. Log: $WorkDir\{identity,parish,resource,task,readiness,reporting,notify,gateway}.log"
Write-Host "[be] Frontend: cd `"$FeDir`"; npm run dev   (đã có .env.local trỏ 5190)"
Write-Host '[be] Nhấn Ctrl+C để dừng script (các service vẫn chạy nền).'
