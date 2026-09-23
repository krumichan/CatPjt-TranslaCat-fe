param([Parameter(Mandatory = $true)][string]$ManifestPath)

$ErrorActionPreference = "Stop"
$manifest = Get-Content -LiteralPath ([IO.Path]::GetFullPath($ManifestPath)) -Raw | ConvertFrom-Json
$workspace = [IO.Path]::GetFullPath([string]$manifest.workspaceRoot)
$all = @(Get-CimInstance Win32_Process)
$owned = [Collections.Generic.HashSet[int]]::new()
function Test-Descendant([int]$Child, [int]$Ancestor) {
    $current = $Child
    for ($depth = 0; $depth -lt 16 -and $current -gt 0; $depth++) {
        if ($current -eq $Ancestor) { return $true }
        $process = $all | Where-Object ProcessId -eq $current | Select-Object -First 1
        if (-not $process) { return $false }
        $current = [int]$process.ParentProcessId
    }
    return $false
}
foreach ($entry in $manifest.processes) {
    $rootPid = [int]$entry.rootPid
    $root = $all | Where-Object ProcessId -eq $rootPid | Select-Object -First 1
    if (-not $root) { continue }
    $recordedStart = ([DateTime]$entry.startedAt).ToUniversalTime()
    $actualStart = ([DateTime]$root.CreationDate).ToUniversalTime()
    if ([Math]::Abs(($actualStart - $recordedStart).TotalSeconds) -gt 2) {
        throw "PID $rootPid creation time no longer matches the recorded test process; refusing to stop it."
    }
    [void]$owned.Add($rootPid)
    $ownerPid = [int]$entry.ownerPid
    if ($ownerPid -gt 0) {
        $owner = $all | Where-Object ProcessId -eq $ownerPid | Select-Object -First 1
        if ($owner -and -not (Test-Descendant $ownerPid $rootPid)) {
            throw "PID $ownerPid is no longer descended from recorded root PID $rootPid; refusing to stop it."
        }
        if ($owner) { [void]$owned.Add($ownerPid) }
    }
}
for ($pass = 0; $pass -lt 16; $pass++) {
    foreach ($process in $all) {
        if ($owned.Contains([int]$process.ParentProcessId)) {
            [void]$owned.Add([int]$process.ProcessId)
        }
    }
}
@($owned) | Sort-Object -Descending | ForEach-Object {
    Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
}
Write-Output "Stopped only the process tree recorded in $ManifestPath"
