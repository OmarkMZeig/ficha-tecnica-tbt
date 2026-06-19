# Servidor HTTP estatico minimo em PowerShell.
# Serve a pasta do projeto na porta 8770 (ou outra via $env:PORT).
# Necessario porque ES modules (import) exigem HTTP - nao funcionam via file://

$ErrorActionPreference = "Stop"

$port = if ($env:PORT) { [int]$env:PORT } else { 8770 }
$root = $PSScriptRoot

$prefix = "http://localhost:$port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "Falha ao iniciar listener em $prefix : $_"
    Write-Host "Tente outra porta:  `$env:PORT=9000; .\serve.ps1"
    exit 1
}

Write-Host "Ficha Tecnica TBT rodando em $prefix"
Write-Host "Abra esse endereco no navegador. Ctrl+C para parar."

$mime = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".mjs"  = "application/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".webp" = "image/webp"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".map"  = "application/json"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        try {
            $rawPath = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
            $rel = $rawPath.TrimStart("/")
            if ([string]::IsNullOrEmpty($rel)) {
                $rel = "index.html"
            } elseif ($rel.EndsWith("/")) {
                $rel = $rel + "index.html"
            }
            $rel = $rel -replace "\.\.", ""
            $rel = $rel -replace "/", "\"
            $filePath = Join-Path $root $rel

            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $contentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentType = $contentType
                $response.ContentLength64 = $bytes.Length
                $response.StatusCode = 200
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rawPath")
                $response.ContentType = "text/plain; charset=utf-8"
                $response.ContentLength64 = $msg.Length
                $response.OutputStream.Write($msg, 0, $msg.Length)
            }
        } catch {
            $response.StatusCode = 500
            $err = [System.Text.Encoding]::UTF8.GetBytes("500: $_")
            $response.OutputStream.Write($err, 0, $err.Length)
        } finally {
            try { $response.Close() } catch {}
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
