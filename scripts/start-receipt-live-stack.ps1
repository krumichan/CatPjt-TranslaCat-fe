param(
    [string]$WorkspaceRoot = (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent),
    [string]$BeEnvironmentSourceScript = "",
    [string]$EvidenceDirectory = "",
    [int]$AiPort = 18001,
    [int]$BePort = 18080,
    [int]$FePort = 13010,
    [switch]$EnableReceiptReviewAssisted,
    [switch]$ProductionFrontend,
    [switch]$EnablePrivateReceiptTrace
)

$ErrorActionPreference = "Stop"
$workspace = [IO.Path]::GetFullPath($WorkspaceRoot)
$feRoot = Join-Path $workspace "CatPjt-TranslaCat-fe"
$beRoot = Join-Path $workspace "CatPjt-TranslaCat-be"
$aiRoot = Join-Path $workspace "CatPjt-TranslaCat-ai"
if (-not $EvidenceDirectory) {
    $EvidenceDirectory = Join-Path $workspace "quality-evidence/receipt-live-runtime"
}
$evidence = [IO.Path]::GetFullPath($EvidenceDirectory)
New-Item -ItemType Directory -Force -Path $evidence | Out-Null

function Assert-PortFree([int]$Port) {
    $probe = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
    try {
        $probe.Start()
    } catch {
        $owner = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
            Select-Object -First 1
        $ownerDescription = if ($owner) { "PID $($owner.OwningProcess)" } else { "another process" }
        throw "Port $Port is already owned by $ownerDescription; refusing to reuse or terminate it."
    } finally {
        $probe.Stop()
    }
}

function Import-LiteralEnvironment([string]$Path) {
    if (-not $Path) { return }
    $allowed = @(
        "SPRING_PROFILES_ACTIVE", "SPRING_DATASOURCE_URL", "SPRING_DATASOURCE_USERNAME",
        "SPRING_DATASOURCE_PASSWORD", "TRANSLACAT_STORAGE_TYPE",
        "TRANSLACAT_STORAGE_LOCAL_ROOT_PATH", "TRANSLACAT_CHAT_PRESENCE_ENABLED",
        "TRANSLACAT_REDIS_VERIFY_ON_STARTUP", "TRANSLACAT_AI_CHAT_TRANSLATION_MODE",
        "LOGGING_LEVEL_JDBC_RESULTSETTABLE", "CORS_ALLOWED_ORIGIN"
    )
    foreach ($line in Get-Content -LiteralPath ([IO.Path]::GetFullPath($Path))) {
        if ($line -notmatch '^\s*\$env:([A-Za-z0-9_]+)\s*=\s*(["''])(.*)\2\s*$') { continue }
        $name = $matches[1]
        if ($allowed -notcontains $name) { continue }
        [Environment]::SetEnvironmentVariable($name, $matches[3], "Process")
    }
}

function Read-DotEnvValue([string]$Path, [string]$Name) {
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match "^\s*$([regex]::Escape($Name))\s*=\s*(.*)\s*$") {
            return $matches[1].Trim().Trim('"').Trim("'")
        }
    }
    return ""
}

function Wait-Port([int]$Port, [Diagnostics.Process]$RootProcess, [int]$Seconds = 180) {
    $deadline = [DateTime]::UtcNow.AddSeconds($Seconds)
    do {
        if ($RootProcess.HasExited) { throw "Process $($RootProcess.Id) exited before binding port $Port." }
        $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($listener) { return [int]$listener.OwningProcess }
        Start-Sleep -Milliseconds 500
    } while ([DateTime]::UtcNow -lt $deadline)
    throw "Timed out waiting for port $Port."
}

function Test-Descendant([int]$Child, [int]$Ancestor) {
    $current = $Child
    for ($depth = 0; $depth -lt 16 -and $current -gt 0; $depth++) {
        if ($current -eq $Ancestor) { return $true }
        $process = Get-CimInstance Win32_Process -Filter "ProcessId=$current" -ErrorAction SilentlyContinue
        if (-not $process) { return $false }
        $current = [int]$process.ParentProcessId
    }
    return $false
}

function Get-ProcessIdentity([int]$ProcessId) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction Stop
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [Text.Encoding]::UTF8.GetBytes([string]$process.CommandLine)
        $commandFingerprint = [Convert]::ToHexString($sha.ComputeHash($bytes)).ToLowerInvariant()
    } finally {
        $sha.Dispose()
    }
    return [ordered]@{
        processId = $ProcessId
        parentProcessId = [int]$process.ParentProcessId
        startedAt = ([DateTime]$process.CreationDate).ToUniversalTime().ToString('o')
        executable = [string]$process.ExecutablePath
        commandFingerprint = $commandFingerprint
    }
}

function Stop-OwnedTree([Diagnostics.Process[]]$Roots) {
    $rootIds = @($Roots | Where-Object { $_ -and -not $_.HasExited } | ForEach-Object Id)
    if (-not $rootIds.Count) { return }
    $all = @(Get-CimInstance Win32_Process)
    $owned = [Collections.Generic.HashSet[int]]::new()
    foreach ($id in $rootIds) { [void]$owned.Add([int]$id) }
    for ($pass = 0; $pass -lt 16; $pass++) {
        foreach ($process in $all) {
            if ($owned.Contains([int]$process.ParentProcessId) -and
                ($process.CommandLine -like "*$workspace*" -or $owned.Contains([int]$process.ParentProcessId))) {
                [void]$owned.Add([int]$process.ProcessId)
            }
        }
    }
    @($owned) | Sort-Object -Descending | ForEach-Object {
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
    }
}

Assert-PortFree $AiPort
Assert-PortFree $BePort
Assert-PortFree $FePort
Import-LiteralEnvironment $BeEnvironmentSourceScript
if ($env:SPRING_DATASOURCE_URL -notmatch '(?i)(localhost|127\.0\.0\.1)') {
    throw "SPRING_DATASOURCE_URL must point to an isolated loopback MySQL instance."
}

$aiPython = Join-Path $aiRoot ".venv/Scripts/python.exe"
$npm = "C:\nvm4w\nodejs\npm.cmd"
Push-Location $aiRoot
try {
    $fingerprintOutput = & $aiPython -B -m app.features.receipt.runtime_identity 2>$null
} finally {
    Pop-Location
}
$fingerprint = @($fingerprintOutput | Where-Object { $_ -match '^[a-f0-9]{64}$' })[-1]
if (-not $fingerprint) { throw "Unable to compute the AI receipt source fingerprint." }
$runId = "receipt-$([DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ'))-$([guid]::NewGuid().ToString('N').Substring(0,8))"
$feDistDirectory = ".next-$runId"
$gitHead = (& git -c "safe.directory=$aiRoot" -C $aiRoot rev-parse HEAD).Trim()
$apiKey = Read-DotEnvValue (Join-Path $aiRoot ".env") "SERVER_API_KEY"
if (-not $apiKey) { throw "SERVER_API_KEY is missing from the AI environment." }

$started = [Collections.Generic.List[Diagnostics.Process]]::new()
try {
    $env:RECEIPT_ANALYSIS_MODE = "VISION_ONLY"
    $env:RECEIPT_VISION_MAX_IMAGE_PIXELS = "24000000"
    $env:RECEIPT_VISION_MAX_IN_FLIGHT = "3"
    $env:RECEIPT_VISION_MAX_RECOVERY_IN_FLIGHT = "2"
    $env:RECEIPT_VISION_MAX_PENDING = "12"
    $env:RECEIPT_ANALYSIS_TOTAL_TIMEOUT_SECONDS = "30"
    $env:RECEIPT_VISION_RECOVERY_MIN_REMAINING_SECONDS = "3"
    $env:RECEIPT_VISION_DISABLE_OCR_WARMUP = "true"
    $env:OCR_WARM_UP = "false"
    $env:RECEIPT_RUNTIME_RUN_ID = $runId
    $env:RECEIPT_RUNTIME_EXPECTED_SOURCE_FINGERPRINT = $fingerprint
    $env:RECEIPT_RUNTIME_GIT_HEAD = $gitHead
    if ($EnablePrivateReceiptTrace) {
        $env:RECEIPT_DEBUG_TRACE_DIR = Join-Path $evidence "traces"
    } else {
        Remove-Item Env:RECEIPT_DEBUG_TRACE_DIR -ErrorAction SilentlyContinue
    }
    $ai = Start-Process -FilePath $aiPython -ArgumentList @(
        '-B', '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', "$AiPort"
    ) -WorkingDirectory $aiRoot -PassThru -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $evidence "ai.stdout.log") `
        -RedirectStandardError (Join-Path $evidence "ai.stderr.log")
    $started.Add($ai)
    $aiOwner = Wait-Port $AiPort $ai 120
    if (-not (Test-Descendant $aiOwner $ai.Id)) { throw "AI port owner is outside the launched process tree." }
    $headers = @{ "X-API-KEY" = $apiKey }
    $identity = Invoke-RestMethod -Uri "http://127.0.0.1:$AiPort/api/v1/account-book/receipts/runtime-identity" -Headers $headers
    if ($identity.run_id -ne $runId -or $identity.source_fingerprint -ne $fingerprint -or
        [int]$identity.process_id -ne $aiOwner -or [int]$identity.provider_call_count -ne 0) {
        throw "AI process-start identity mismatch; provider analysis was not started."
    }
    Push-Location $aiRoot
    try {
        $runtimeConfigJson = & $aiPython -B -c @'
import json
from app.ai.model_policy import get_model_name_for_task
from app.core.config import settings
print(json.dumps({
    "provider": settings.AI_TEXT_PROVIDER,
    "model": get_model_name_for_task("RECEIPT_ANALYSIS"),
    "analysisMode": settings.RECEIPT_ANALYSIS_MODE,
    "maxImagePixels": settings.RECEIPT_VISION_MAX_IMAGE_PIXELS,
    "maxInFlight": settings.RECEIPT_VISION_MAX_IN_FLIGHT,
    "maxRecoveryInFlight": settings.RECEIPT_VISION_MAX_RECOVERY_IN_FLIGHT,
    "maxPending": settings.RECEIPT_VISION_MAX_PENDING,
    "totalTimeoutSeconds": settings.RECEIPT_ANALYSIS_TOTAL_TIMEOUT_SECONDS,
    "ocrWarmUp": settings.OCR_WARM_UP,
}))
'@
    } finally {
        Pop-Location
    }
    $runtimeConfig = $runtimeConfigJson | ConvertFrom-Json

    $env:SERVER_ADDRESS = "127.0.0.1"
    $env:SERVER_PORT = "$BePort"
    $env:AI_SERVER_URL = "http://127.0.0.1:$AiPort"
    $env:AI_SERVER_API_KEY = $apiKey
    $env:RECEIPT_RUNTIME_EXPECTED_RUN_ID = $runId
    $env:RECEIPT_RUNTIME_EXPECTED_SOURCE_FINGERPRINT = $fingerprint
    $env:CORS_ALLOWED_ORIGIN = "http://localhost:$FePort"
    Push-Location $beRoot
    try {
        & (Join-Path $beRoot "gradlew.bat") bootJar --no-daemon
        if ($LASTEXITCODE -ne 0) { throw "BE bootJar build failed with exit code $LASTEXITCODE." }
    } finally {
        Pop-Location
    }
    $beJar = Get-ChildItem -LiteralPath (Join-Path $beRoot "build/libs") -Filter "*.jar" |
        Where-Object Name -NotLike "*-plain.jar" |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 1
    if (-not $beJar) { throw "The latest BE bootJar was not found." }
    $java = Join-Path $env:JAVA_HOME "bin/java.exe"
    if (-not (Test-Path -LiteralPath $java)) { throw "JAVA_HOME does not provide bin/java.exe." }
    $be = Start-Process -FilePath $java -ArgumentList @('-jar', $beJar.FullName) `
        -WorkingDirectory $beRoot -PassThru -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $evidence "be.stdout.log") `
        -RedirectStandardError (Join-Path $evidence "be.stderr.log")
    $started.Add($be)
    $beOwner = Wait-Port $BePort $be 240
    if (-not (Test-Descendant $beOwner $be.Id)) { throw "BE port owner is outside the launched process tree." }

    $env:NEXT_PUBLIC_API_URL = "http://127.0.0.1:$BePort/api/v1"
    $env:API_URL = "http://127.0.0.1:$BePort/api/v1"
    $env:NEXTAUTH_URL = "http://localhost:$FePort"
    # A run-specific cache prevents another validation/build from corrupting the
    # active dev server's generated routes and manifests.
    $env:NEXT_DIST_DIR = $feDistDirectory
    $env:NEXT_PUBLIC_RECEIPT_REVIEW_ASSISTED = if ($EnableReceiptReviewAssisted) { "true" } else { "false" }
    if ($ProductionFrontend) {
        Push-Location $feRoot
        try {
            & $npm run build
            if ($LASTEXITCODE -ne 0) { throw "FE production build failed with exit code $LASTEXITCODE." }
        } finally {
            Pop-Location
        }
        $feArguments = @('run', 'start', '--', '--hostname', 'localhost', '--port', "$FePort")
    } else {
        $feArguments = @('run', 'dev', '--', '--webpack', '--hostname', 'localhost', '--port', "$FePort")
    }
    $fe = Start-Process -FilePath $npm -ArgumentList $feArguments -WorkingDirectory $feRoot -PassThru -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $evidence "fe.stdout.log") `
        -RedirectStandardError (Join-Path $evidence "fe.stderr.log")
    $started.Add($fe)
    $feOwner = Wait-Port $FePort $fe 180
    if (-not (Test-Descendant $feOwner $fe.Id)) { throw "FE port owner is outside the launched process tree." }

    $manifest = [ordered]@{
        createdAt = [DateTime]::UtcNow.ToString('o')
        workspaceRoot = $workspace
        runId = $runId
        sourceFingerprint = $fingerprint
        gitHeads = @{
            fe = (& git -c "safe.directory=$feRoot" -C $feRoot rev-parse HEAD).Trim()
            be = (& git -c "safe.directory=$beRoot" -C $beRoot rev-parse HEAD).Trim()
            ai = $gitHead
        }
        urls = @{ ai = "http://127.0.0.1:$AiPort"; be = "http://127.0.0.1:$BePort/api/v1"; fe = "http://localhost:$FePort" }
        receiptReviewAssisted = [bool]$EnableReceiptReviewAssisted
        frontendMode = if ($ProductionFrontend) { 'production-build-start' } else { 'development' }
        privateReceiptTraceEnabled = [bool]$EnablePrivateReceiptTrace
        feDistDirectory = $feDistDirectory
        workerCount = 1
        receiptVision = $runtimeConfig
        aiIdentity = $identity
        processes = @(
            @{ role = 'ai'; rootPid = $ai.Id; ownerPid = $aiOwner; workingDirectory = $aiRoot; startedAt = $ai.StartTime.ToUniversalTime().ToString('o'); rootIdentity = Get-ProcessIdentity $ai.Id; ownerIdentity = Get-ProcessIdentity $aiOwner },
            @{ role = 'be'; rootPid = $be.Id; ownerPid = $beOwner; workingDirectory = $beRoot; startedAt = $be.StartTime.ToUniversalTime().ToString('o'); rootIdentity = Get-ProcessIdentity $be.Id; ownerIdentity = Get-ProcessIdentity $beOwner },
            @{ role = 'fe'; rootPid = $fe.Id; ownerPid = $feOwner; workingDirectory = $feRoot; startedAt = $fe.StartTime.ToUniversalTime().ToString('o'); rootIdentity = Get-ProcessIdentity $fe.Id; ownerIdentity = Get-ProcessIdentity $feOwner }
        )
    }
    $manifestPath = Join-Path $evidence "runtime-manifest.json"
    $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
    Write-Output $manifestPath
} catch {
    Stop-OwnedTree @($started)
    throw
}
