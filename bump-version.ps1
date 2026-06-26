# Quebra-cache determinístico para os módulos ES + CSS.
# Reescreve TODOS os ?v=N (imports em src/*.js, <script>/<link> no index.html)
# para a MESMA versão nova. Rodar antes de cada deploy: .\bump-version.ps1
# Importante: módulos ES têm identidade por URL — todas as referências a um
# módulo precisam da mesma versão, senão o navegador carrega 2 cópias.
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$verFile = Join-Path $root "VERSION"
$cur = if (Test-Path $verFile) { [int](Get-Content $verFile -Raw).Trim() } else { 15 }
$new = $cur + 1

$utf8 = New-Object System.Text.UTF8Encoding($false)  # sem BOM
function Rewrite($path, [scriptblock]$fn) {
  $txt = [System.IO.File]::ReadAllText($path)
  $out = & $fn $txt
  if ($out -ne $txt) { [System.IO.File]::WriteAllText($path, $out, $utf8); return $true }
  return $false
}

$changed = 0
# specifiers relativos './x.js' (estáticos e dinâmicos) em todos os módulos
Get-ChildItem (Join-Path $root "src") -Filter *.js | ForEach-Object {
  $f = $_.FullName
  if (Rewrite $f { param($t) [regex]::Replace($t, "(['""]\./[A-Za-z0-9_\-]+\.js)(\?v=\d+)?(['""])", "`$1?v=$new`$3") }) { $changed++ }
}
# index.html: main.js (módulo), css e vendor
$idx = Join-Path $root "index.html"
Rewrite $idx { param($t)
  $t = [regex]::Replace($t, "(src/main\.js)(\?v=\d+)?", "`$1?v=$new")
  $t = [regex]::Replace($t, "(styles/[A-Za-z0-9_\-]+\.css)(\?v=\d+)?", "`$1?v=$new")
  $t = [regex]::Replace($t, "(vendor/html-to-image\.js)(\?v=\d+)?", "`$1?v=$new")
  $t = [regex]::Replace($t, "(assets/favicon\.svg)(\?v=\d+)?", "`$1?v=$new")
  $t
} | Out-Null

Set-Content -Path $verFile -Value $new -Encoding ascii -NoNewline
"Versao $cur -> $new  ($changed arquivos .js atualizados)"
