$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$here = $PSScriptRoot
$repo = [IO.Path]::GetFullPath((Join-Path $here '..\..\..\..\..'))
$plan = @(Import-Csv (Join-Path $here 'icon_plan.csv') -Encoding UTF8)
$columns = 8
$cellWidth = 142
$cellHeight = 124
$rows = [Math]::Ceiling($plan.Count / $columns)
$out = Join-Path $repo 'output\mastery_icons_all.png'
$bmp = New-Object Drawing.Bitmap ($columns * $cellWidth), ($rows * $cellHeight)
$g = [Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([Drawing.ColorTranslator]::FromHtml('#191b24'))
$font = New-Object Drawing.Font 'Malgun Gothic', 11
$small = New-Object Drawing.Font 'Arial', 8
$text = New-Object Drawing.SolidBrush ([Drawing.ColorTranslator]::FromHtml('#ddd9cf'))
$muted = New-Object Drawing.SolidBrush ([Drawing.ColorTranslator]::FromHtml('#aaa399'))
$cell = New-Object Drawing.SolidBrush ([Drawing.ColorTranslator]::FromHtml('#242630'))
$border = New-Object Drawing.Pen ([Drawing.ColorTranslator]::FromHtml('#6c5942'))
try {
    for ($i=0; $i -lt $plan.Count; $i++) {
        $x = ($i % $columns) * $cellWidth
        $y = [Math]::Floor($i / $columns) * $cellHeight
        $g.FillRectangle($cell, $x+4, $y+4, $cellWidth-8, $cellHeight-8)
        $g.DrawRectangle($border, $x+4, $y+4, $cellWidth-8, $cellHeight-8)
        $artPath = Join-Path $repo $plan[$i].asset_path
        $img = [Drawing.Image]::FromFile($artPath)
        try { $g.DrawImage($img, $x+33, $y+4, 76, 76) } finally { $img.Dispose() }
        $g.DrawString($plan[$i].name_ko, $font, $text, $x+8, $y+80)
        $g.DrawString($plan[$i].node_id, $small, $muted, $x+8, $y+103)
    }
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($out)) | Out-Null
    $bmp.Save($out, [Drawing.Imaging.ImageFormat]::Png)
    Write-Output $out
} finally {
    $border.Dispose(); $cell.Dispose(); $muted.Dispose(); $text.Dispose(); $small.Dispose(); $font.Dispose(); $g.Dispose(); $bmp.Dispose()
}
