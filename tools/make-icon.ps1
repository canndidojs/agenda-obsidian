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

function Render([int]$s) {
    $bmp = New-Object System.Drawing.Bitmap $s, $s
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.PixelOffsetMode = 'HighQuality'
    $g.Clear([System.Drawing.Color]::Transparent)

    # Base: quadrado arredondado com degradê índigo
    $base = RoundRect 0 0 $s $s ($s * 0.23)
    $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush ((New-Object System.Drawing.Point 0, 0), (New-Object System.Drawing.Point $s, $s), (C '#8B6CFF'), (C '#3E24C9'))
    $g.FillPath($grad, $base)

    # Sombra suave da folha
    $sh = RoundRect ($s * 0.20) ($s * 0.27) ($s * 0.60) ($s * 0.58) ($s * 0.085)
    $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(60, 20, 0, 90))), $sh)

    # Folha branca
    $card = RoundRect ($s * 0.20) ($s * 0.24) ($s * 0.60) ($s * 0.58) ($s * 0.085)
    $g.FillPath([System.Drawing.Brushes]::White, $card)

    # Faixa âmbar no topo da folha
    $g.SetClip($card)
    $g.FillRectangle((New-Object System.Drawing.SolidBrush (C '#FFB547')), $s * 0.20, $s * 0.24, $s * 0.60, $s * 0.15)
    $g.ResetClip()

    # Argolas
    foreach ($cx in 0.34, 0.66) {
        $ring = RoundRect ($s * ($cx - 0.025)) ($s * 0.17) ($s * 0.05) ($s * 0.12) ($s * 0.025)
        $g.FillPath((New-Object System.Drawing.SolidBrush (C '#2A1790')), $ring)
    }

    # Check + linhas de anotação
    $pen = New-Object System.Drawing.Pen (C '#4B2FD6'), ($s * 0.045)
    $pen.StartCap = 'Round'; $pen.EndCap = 'Round'; $pen.LineJoin = 'Round'
    $g.DrawLines($pen, @(
        (New-Object System.Drawing.PointF ($s * 0.27), ($s * 0.54)),
        (New-Object System.Drawing.PointF ($s * 0.32), ($s * 0.59)),
        (New-Object System.Drawing.PointF ($s * 0.41), ($s * 0.48))))
    $lp = New-Object System.Drawing.Pen (C '#C9C3E8'), ($s * 0.04)
    $lp.StartCap = 'Round'; $lp.EndCap = 'Round'
    $g.DrawLine($lp, $s * 0.49, $s * 0.53, $s * 0.72, $s * 0.53)
    $g.DrawLine($lp, $s * 0.27, $s * 0.69, $s * 0.72, $s * 0.69)
    $g.Dispose()
    $bmp
}

function PngBytes($bmp) {
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    , $ms.ToArray()
}

# PNG grande
$big = Render 512
$big.Save((Join-Path $out 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)

# ICO com vários tamanhos (PNG embutido)
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
