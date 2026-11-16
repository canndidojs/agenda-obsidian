Add-Type -AssemblyName System.Drawing
$out = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets'
New-Item -ItemType Directory -Force $out | Out-Null

function RoundRect($x, $y, $w, $h, $r) {
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $p.AddArc($x, $y, $d, $d, 180, 90)
    $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $p.CloseFigure()
    $p
}
function C($hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }

# Ícone minimalista: fundo roxo liso, calendário branco só com contorno, faixa e um marcador do dia
function Render([int]$s) {
    $bmp = New-Object System.Drawing.Bitmap $s, $s
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.PixelOffsetMode = 'HighQuality'
    $g.Clear([System.Drawing.Color]::Transparent)
    $white = [System.Drawing.Brushes]::White

    $g.FillPath((New-Object System.Drawing.SolidBrush (C '#7C5CE6')), (RoundRect 0 0 $s $s ($s * 0.22)))

    $x = $s * 0.25; $y = $s * 0.27; $w = $s * 0.50; $h = $s * 0.48
    $t = [Math]::Max($s * 0.065, 1.5)

    # contorno do calendário
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), $t
    $pen.LineJoin = 'Miter'
    $g.DrawRectangle($pen, $x + $t / 2, $y + $t / 2, $w - $t, $h - $t)

    # faixa superior cheia
    $g.FillRectangle($white, $x, $y, $w, $s * 0.15)

    # marcador do dia
    $m = $s * 0.10
    $gap = $s * 0.055
    $g.FillRectangle($white, $x + $w - $t - $gap - $m, $y + $h - $t - $gap - $m, $m, $m)
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
[System.IO.File]::WriteAllBytes((Join-Path $out 'app.ico'), $ms.ToArray())
Write-Output "ok: $out"
