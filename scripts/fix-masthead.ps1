$ErrorActionPreference = "Stop"

if (-not $env:GITHUB_TOKEN) { Write-Error "GITHUB_TOKEN no esta set"; exit 1 }
$h = @{ Authorization = "Bearer $env:GITHUB_TOKEN"; Accept = "application/vnd.github+json" }
$repo = "VU-mkt/newsroom"
$path = "vu_newsroom.html"

Write-Host "Descargando..."
$r = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/contents/$path" -Headers $h
$sha = $r.sha
$clean = ($r.content -replace "`r","") -replace "`n",""
$bytes = [Convert]::FromBase64String($clean)
$html = [Text.Encoding]::UTF8.GetString($bytes)
Write-Host "  sha=$sha size=$($bytes.Length)"

# Detectar y reemplazar el header roto con uno limpio
# El header arranca con '<header class="masthead">' y termina con '</header>'
$headerStart = $html.IndexOf('<header class="masthead">')
if ($headerStart -lt 0) { Write-Error "header no encontrado"; exit 1 }
$headerEnd = $html.IndexOf('</header>', $headerStart) + '</header>'.Length

$newHeader = @'
<header class="masthead">
  <div class="masthead-inner">
    <div class="masthead-left">
      <a class="website-btn" href="https://vusecurity.com" target="_blank" rel="noopener" title="Ir a vusecurity.com" aria-label="Ir a vusecurity.com">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M3 12h18"></path>
          <path d="M12 3a14 14 0 0 1 0 18"></path>
          <path d="M12 3a14 14 0 0 0 0 18"></path>
        </svg>
      </a>
    </div>
    <a class="masthead-center" href="#home">
      <img src="Logo.blanco.png" alt="VU" style="height: 64px; width: auto; display: block;">
      <span class="newsroom-label">Newsroom Interno</span>
      <span class="newsroom-sublabel">by Marketing</span>
    </a>
    <div class="masthead-right"></div>
  </div>
</header>
'@

$html = $html.Substring(0, $headerStart) + $newHeader + $html.Substring($headerEnd)
Write-Host "  header reescrito"

# Cambiar el color del icono del website-btn de negro a blanco
$cssOldBtn = "background: var(--vu-naranja); color: var(--vu-negro);"
$cssNewBtn = "background: var(--vu-naranja); color: var(--vu-blanco);"
if ($html.Contains($cssOldBtn)) {
  $html = $html.Replace($cssOldBtn, $cssNewBtn)
  Write-Host "  website-btn icon color: negro -> blanco"
} else {
  Write-Host "  WARNING: website-btn color string no encontrado"
}

# Agregar CSS para .newsroom-sublabel justo despues de .newsroom-label
$labelCssAnchor = "text-transform: uppercase;`n  }"
$sublabelCss = @'
text-transform: uppercase;
  }
  .newsroom-sublabel {
    font-family: var(--font-body); font-size: 12px;
    color: var(--vu-gris-light); font-style: italic;
    margin-top: 2px;
  }
'@
if ($html.Contains($labelCssAnchor)) {
  $html = $html.Replace($labelCssAnchor, $sublabelCss)
  Write-Host "  .newsroom-sublabel CSS agregado"
} else {
  Write-Host "  WARNING: anchor de label CSS no encontrado (no se agrego sublabel)"
}

# Encode + push
$utf8 = [Text.UTF8Encoding]::new($false)
$newBytes = $utf8.GetBytes($html)
$b64 = [Convert]::ToBase64String($newBytes)
$msg = "fix(ui): rebuild broken masthead + white icon + by Marketing subtitle"
$body = @{ message = $msg; content = $b64; sha = $sha; branch = "main" } | ConvertTo-Json -Depth 3

Write-Host ""
Write-Host "Pusheando..."
$resp = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/contents/$path" -Method PUT -Headers $h -Body $body -ContentType "application/json"
Write-Host "  COMMIT: $($resp.commit.sha)"
Write-Host "  URL:    $($resp.commit.html_url)"
