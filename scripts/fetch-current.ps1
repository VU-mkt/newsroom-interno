$ErrorActionPreference = "Stop"
$h = @{ Authorization = "Bearer $env:GITHUB_TOKEN"; Accept = "application/vnd.github+json" }
$r = Invoke-RestMethod -Uri "https://api.github.com/repos/VU-mkt/newsroom/contents/vu_newsroom.html" -Headers $h
$clean = ($r.content -replace "`r","") -replace "`n",""
$bytes = [Convert]::FromBase64String($clean)
$html = [Text.Encoding]::UTF8.GetString($bytes)
[IO.File]::WriteAllText("C:\Users\JuanLundahl\OneDrive - VU SECURITY S.A\Documentos\vu-one-demo\content\vu_newsroom_remote.html", $html, [Text.UTF8Encoding]::new($false))
Write-Host "Downloaded $($bytes.Length) bytes — sha: $($r.sha)"
Write-Host "Saved to content/vu_newsroom_remote.html"
