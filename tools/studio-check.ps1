# Studio upload safety checks (adapted from last-hayride). Run from anywhere, in PowerShell:
#
#     powershell -NoProfile -ExecutionPolicy Bypass -File tools/studio-check.ps1
#
# Run it TWICE during an upload session:
#   - right after opening the project in Studio (catches a forced engine bump)
#   - right after Studio's own Build (catches the editor dropping assets)
#
# The editor ships only files whose literal `@project/assets/...` path appears in the BUILT
# bundle. Every model in this game is built in code, so the asset surface is the Skybox sky
# plus the 238 ElevenLabs MP3s (src/game/audioManifest.ts keeps them literal).

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

$ENGINE = '19.0.1'
$LITERALS = 239   # 238 mp3 + 1 webp (sky)
$MP3 = 238
$script:fails = 0

function Check($label, $actual, $expected) {
    $pass = ("$actual" -eq "$expected")
    if ($pass) {
        Write-Host ("  ok    {0,-30} {1}" -f $label, $actual) -ForegroundColor Green
    } else {
        $script:fails++
        Write-Host ("  FAIL  {0,-30} {1}   (expected {2})" -f $label, $actual, $expected) -ForegroundColor Red
    }
}

Write-Host "`n-- version triple (a bump here is the blank-screen bug) --" -ForegroundColor Cyan
$proj = Get-Content 'EverythingIsFine.genesys-project' -Raw | ConvertFrom-Json
Check 'project file' $proj.engineVersion $ENGINE
$pkg = Get-Content 'package.json' -Raw | ConvertFrom-Json
Check 'package.json' $pkg.dependencies.'@gnsx/genesys.js' $ENGINE
$eng = Get-Content 'node_modules/@gnsx/genesys.js/package.json' -Raw | ConvertFrom-Json
Check 'node_modules' $eng.version $ENGINE

Write-Host "`n-- what the build will actually ship --" -ForegroundColor Cyan
if (Test-Path '.dist/EverythingIsFine.genesys-project') {
    $dist = Get-Content '.dist/EverythingIsFine.genesys-project' -Raw | ConvertFrom-Json
    Check '.dist project file' $dist.engineVersion $ENGINE
    $lits = [regex]::Matches((Get-Content '.dist/game.js' -Raw), "@project/(assets/[^'`"`$]+?\.(mp3|webp|glb|png|jpg|ttf))") |
        ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
    $missing = @($lits | Where-Object { -not (Test-Path ".dist/$_") })
    Check 'asset literals in game.js' $lits.Count $LITERALS
    Check 'literals missing from .dist' $missing.Count 0
    $missing | ForEach-Object { Write-Host "        missing: $_" -ForegroundColor Red }
    Check '.dist sounds (mp3)' @(Get-ChildItem '.dist/assets/audio' -Recurse -Filter *.mp3).Count $MP3
    Check 'theme song' (Test-Path '.dist/assets/audio/music/theme.mp3') $true
} else {
    Write-Host '  .dist not built yet -- run Build in Studio, then run this again' -ForegroundColor Yellow
}

Write-Host "`n-- working tree --" -ForegroundColor Cyan
$dirty = @(git status --short)
if ($dirty.Count -eq 0) {
    Write-Host '  ok    clean' -ForegroundColor Green
} else {
    Write-Host '  Studio (or we) wrote these -- fine unless a version above failed:' -ForegroundColor Yellow
    $dirty | ForEach-Object { Write-Host "        $_" }
}

if ($script:fails -eq 0) {
    Write-Host "`nALL CHECKS PASSED -- safe to upload`n" -ForegroundColor Green
} else {
    Write-Host "`n$($script:fails) CHECK(S) FAILED -- do not upload, report this`n" -ForegroundColor Red
    exit 1
}
