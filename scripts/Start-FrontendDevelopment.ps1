param(
    [string]$EnvironmentFile = (Join-Path $PSScriptRoot '../.env.local'),
    [ValidateSet('Development', 'Production')][string]$Mode = 'Development',
    [switch]$Build,
    [switch]$ValidateOnly
)

$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot

# 기존 로컬 로그인 설정을 재사용하고, 선택한 파일 밖의 설정과 섞이지 않게 한다.
$allowed = @(
    'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_WS_URL',
    'API_URL', 'NEXTAUTH_URL', 'NEXTAUTH_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'
)
$values = @{}
foreach ($line in [IO.File]::ReadAllLines([IO.Path]::GetFullPath($EnvironmentFile))) {
    if (-not $line.Trim() -or $line.TrimStart().StartsWith('#')) { continue }
    if ($line -notmatch '^([A-Z_]+)=(.*)$' -or $allowed -notcontains $Matches[1]) {
        throw 'The local frontend environment contains an unsupported setting.'
    }
    $name = $Matches[1]
    if ($values.ContainsKey($name)) { throw "Duplicate local frontend setting: $name" }
    $values[$name] = $Matches[2].Trim().Trim('"').Trim("'")
}

# 브라우저 HTTP와 STOMP도 BE의 loopback 주소만 사용한다.
foreach ($name in @('NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_API_URL', 'API_URL', 'NEXTAUTH_URL', 'NEXT_PUBLIC_WS_URL')) {
    $uri = $null
    $scheme = if ($name -eq 'NEXT_PUBLIC_WS_URL') { 'ws' } else { 'http' }
    if (-not [Uri]::TryCreate($values[$name], [UriKind]::Absolute, [ref]$uri) -or
        $uri.Scheme -ne $scheme -or $uri.Host -notin @('localhost', '127.0.0.1', '[::1]') -or
        $uri.UserInfo -or $uri.Query -or $uri.Fragment) {
        throw "$name must be a plain loopback $scheme URL."
    }
}
if ($values['API_URL'] -ne $values['NEXT_PUBLIC_API_URL']) {
    throw 'Server and browser API URLs must point to the same local BE.'
}
if ($values['NEXTAUTH_URL'] -ne $values['NEXT_PUBLIC_SITE_URL']) {
    throw 'NextAuth and browser site URLs must use the same local origin.'
}
foreach ($name in @('NEXTAUTH_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET')) {
    if ([string]::IsNullOrWhiteSpace($values[$name])) { throw "Missing local frontend setting: $name" }
}
if ($ValidateOnly) {
    Write-Output 'Local frontend configuration validated; secret values withheld.'
    return
}

# 환경변수는 이 프로세스와 자식에만 공급하고 사용 중인 NVM 런타임을 그대로 사용한다.
foreach ($name in $values.Keys) { [Environment]::SetEnvironmentVariable($name, $values[$name], 'Process') }
$npm = 'C:\nvm4w\nodejs\npm.cmd'
if (-not (Test-Path -LiteralPath $npm)) { $npm = (Get-Command npm.cmd -ErrorAction Stop).Source }
$site = [Uri]$values['NEXTAUTH_URL']
Push-Location $repository
try {
    if ($Build) {
        & $npm run build
        if ($LASTEXITCODE -ne 0) { throw "Frontend build failed with exit code $LASTEXITCODE." }
    }
    if ($Mode -eq 'Production') {
        & $npm run start -- --hostname $site.Host --port $site.Port
    } else {
        & $npm run dev -- --webpack --hostname $site.Host --port $site.Port
    }
    if ($LASTEXITCODE -ne 0) { throw "Frontend exited with code $LASTEXITCODE." }
} finally {
    Pop-Location
}
