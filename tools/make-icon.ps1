Add-Type -AssemblyName System.Drawing
$out = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets'
New-Item -ItemType Directory -Force $out | Out-Null

function RoundRect($x, $y, $w, $h, $r) {
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = [Math]::Max($r * 2, 0.01)
    $p.AddArc($x, $y, $d, $d, 180, 90)
    $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $p.CloseFigure()
    $p
}
function C($hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }

# Ícone plano: fundo preto, folha de calendário em contorno branco, faixa e check laranja
function Render([int]$s) {
    $bmp = New-Object System.Drawing.Bitmap $s, $s
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.PixelOffsetMode = 'HighQuality'
    $g.Clear([System.Drawing.Color]::Transparent)
    $orange = C '#FF6A2B'

    $g.FillPath((New-Object System.Drawing.SolidBrush (C '#0F0F10')), (RoundRect 0 0 $s $s ($s * 0.12)))

    # Faixa laranja no topo da folha
    $g.FillRectangle((New-Object System.Drawing.SolidBrush $orange), $s * 0.20, $s * 0.26, $s * 0.60, $s * 0.14)

    # Contorno branco da folha
    $w = [Math]::Max($s * 0.055, 1.2)
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), $w
    $pen.LineJoin = 'Miter'
    $g.DrawRectangle($pen, $s * 0.20 + $w / 2, $s * 0.26 + $w / 2, $s * 0.60 - $w, $s * 0.56 - $w)

    # Argolas
    $g.FillRectangle([System.Drawing.Brushes]::White, $s * 0.33, $s * 0.17, $s * 0.055, $s * 0.15)
    $g.FillRectangle([System.Drawing.Brushes]::White, $s * 0.615, $s * 0.17, $s * 0.055, $s * 0.15)

    # Check laranja
    $cp = New-Object System.Drawing.Pen $orange, ([Math]::Max($s * 0.07, 1.5))
    $cp.LineJoin = 'Miter'; $cp.StartCap = 'Flat'; $cp.EndCap = 'Flat'
    $g.DrawLines($cp, @(
        (New-Object System.Drawing.PointF ($s * 0.34), ($s * 0.62)),
        (New-Object System.Drawing.PointF ($s * 0.455), ($s * 0.72)),
        (New-Object System.Drawing.PointF ($s * 0.67), ($s * 0.52))))
    $g.Dispose()
    $bmp
}

function PngBytes($bmp) {
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    , $ms.ToArray()
}

$big = Render 512
$big.Save((Join-Path $out 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)

$sizes = 16, 24, 32, 48, 64, 128, 256
$imgs = foreach ($s in $sizes) { , (PngBytes (Render $s)) }
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter $ms
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
    $s = $sizes[$i]
    $dim = if ($s -ge 256) { 0 } else { $s }
    $bw.Write([byte]$dim); $bw.Write([byte]$dim); $bw.Write([byte]0); $bw.Write([byte]0)
    $bw.Write([uint16]1); $bw.Write([uint16]32)
    $bw.Write([uint32]$imgs[$i].Length); $bw.Write([uint32]$offset)
    $offset += $imgs[$i].Length
}
foreach ($b in $imgs) { $bw.Write($b) }
$bw.Flush()
[System.IO.File]::WriteAllBytes((Join-Path $out 'icon.ico'), $ms.ToArray())
Write-Output "ok: $out"
