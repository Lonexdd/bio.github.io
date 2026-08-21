# Simple static server for local preview.
# Run:  powershell -ExecutionPolicy Bypass -File serve.ps1
# Then open http://localhost:5173

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$prefix = "http://localhost:5173/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Serving $root at $prefix  (Ctrl+C to stop)"

$mime = @{
  ".html"  = "text/html; charset=utf-8"
  ".css"   = "text/css; charset=utf-8"
  ".js"    = "application/javascript; charset=utf-8"
  ".json"  = "application/json; charset=utf-8"
  ".jpg"   = "image/jpeg"
  ".jpeg"  = "image/jpeg"
  ".png"   = "image/png"
  ".webp"  = "image/webp"
  ".svg"   = "image/svg+xml"
  ".ico"   = "image/x-icon"
  ".woff2" = "font/woff2"
}

while ($listener.IsListening) {
  try {
    $ctx  = $listener.GetContext()
    $path = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($path -eq "/") { $path = "/index.html" }
    $file = Join-Path $root ($path.TrimStart("/").Replace("/", "\"))

    if (Test-Path $file -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404 not found")
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $ctx.Response.OutputStream.Close()
  } catch {
    Write-Host ("Error: " + $_.Exception.Message)
  }
}
