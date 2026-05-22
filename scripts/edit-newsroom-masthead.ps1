# Edita vu-mkt/newsroom/vu_newsroom.html via GitHub API:
# - Mueve el boton .website-btn de .masthead-right a .masthead-left
# - Le da display:flex; justify-content:flex-start a .masthead-left
# El Action de sync se dispara automatico y replica a newsroom-interno.

$ErrorActionPreference = "Stop"

if (-not $env:GITHUB_TOKEN) {
  Write-Error "GITHUB_TOKEN env var no esta set"
  exit 1
}

$h = @{ Authorization = "Bearer $env:GITHUB_TOKEN"; Accept = "application/vnd.github+json" }
$repo = "VU-mkt/newsroom"
$path = "vu_newsroom.html"

# 1. Download current
Write-Host "Descargando $repo/$path ..."
$r = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/contents/$path" -Headers $h
$sha = $r.sha
$clean = ($r.content -replace "`r","") -replace "`n",""
$bytes = [Convert]::FromBase64String($clean)
$html = [Text.Encoding]::UTF8.GetString($bytes)
Write-Host "  SHA: $sha"
Write-Host "  Size: $($bytes.Length) bytes"

# 2. CSS edit: agregar flex a .masthead-left
$cssOld = ".masthead-left { }"
$cssNew = ".masthead-left { display: flex; align-items: center; justify-content: flex-start; }"
if (-not ($html.Contains($cssOld))) {
  Write-Error "No se encontro '.masthead-left {}' en el HTML"
  exit 1
}
$html = $html.Replace($cssOld, $cssNew)
Write-Host "  CSS .masthead-left actualizado"

# 3. HTML edit: mover el boton de right a left
$oldLeft = '<div class="masthead-left"></div>'
if (-not ($html.Contains($oldLeft))) {
  Write-Error "No se encontro el div masthead-left vacio"
  exit 1
}

$rightOpenTag = '<div class="masthead-right">'
$rightIdx = $html.IndexOf($rightOpenTag)
if ($rightIdx -lt 0) { Write-Error "No se encontro masthead-right"; exit 1 }

$closingAnchorIdx = $html.IndexOf('</a>', $rightIdx)
if ($closingAnchorIdx -lt 0) { Write-Error "No se encontro </a> del website-btn"; exit 1 }
$closingDivIdx = $html.IndexOf('</div>', $closingAnchorIdx)
if ($closingDivIdx -lt 0) { Write-Error "No se encontro </div> de cierre"; exit 1 }
$rightBlockEnd = $closingDivIdx + '</div>'.Length

$rightBlock = $html.Substring($rightIdx, $rightBlockEnd - $rightIdx)

$buttonStart = $rightBlock.IndexOf('<a class="website-btn"')
$buttonEnd = $rightBlock.LastIndexOf('</a>') + '</a>'.Length
$buttonHtml = $rightBlock.Substring($buttonStart, $buttonEnd - $buttonStart)
$len = $buttonHtml.Length
Write-Host "  Boton extraido ($len chars)"

$newLeft = '<div class="masthead-left">' + "`n      " + $buttonHtml + "`n    " + '</div>'
$html = $html.Replace($oldLeft, $newLeft)

$emptyRight = '<div class="masthead-right"></div>'
$html = $html.Substring(0, $rightIdx) + $emptyRight + $html.Substring($rightBlockEnd)
Write-Host "  Boton movido a masthead-left, masthead-right vacio"

# 4. Encode + PUT
$utf8NoBom = [Text.UTF8Encoding]::new($false)
$newBytes = $utf8NoBom.GetBytes($html)
$b64 = [Convert]::ToBase64String($newBytes)

$msg = "ui: move VU website button to top-left to avoid overlap with MFA logout button"
$body = @{ message = $msg; content = $b64; sha = $sha; branch = "main" } | ConvertTo-Json -Depth 3

Write-Host ""
Write-Host "Pusheando a $repo ..."
$resp = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/contents/$path" -Method PUT -Headers $h -Body $body -ContentType "application/json"
Write-Host "  COMMIT: $($resp.commit.sha)"
Write-Host "  URL:    $($resp.commit.html_url)"
Write-Host ""
Write-Host "El GitHub Action sincronizara newsroom-interno en ~30s, despues Vercel redeploya."
