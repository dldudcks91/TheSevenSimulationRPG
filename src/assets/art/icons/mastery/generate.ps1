param([string]$NodeId, [switch]$Force, [switch]$RecolorSins, [switch]$RecolorClasses)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$repo = [IO.Path]::GetFullPath((Join-Path $here '..\..\..\..\..'))
$plan = @(Import-Csv (Join-Path $here 'icon_plan.csv') -Encoding UTF8)
$nodes = @(Import-Csv (Join-Path $repo 'src\data\mastery_node.csv') -Encoding UTF8)
$classColors = @{}
foreach ($class in (Import-Csv (Join-Path $repo 'src\data\class.csv') -Encoding UTF8)) {
    if ($class.color_hex) {
        if ($class.color_hex -notmatch '^#[0-9a-fA-F]{6}$') { throw "Invalid class color: $($class.class_id)" }
        $classColors[$class.class_id] = $class.color_hex
    }
}

if ($plan.Count -ne $nodes.Count) { throw "Icon plan count $($plan.Count) differs from mastery data count $($nodes.Count)." }
$ids = @{}
foreach ($row in $plan) {
    if ($ids.ContainsKey($row.node_id)) { throw "Duplicate icon plan ID: $($row.node_id)" }
    $ids[$row.node_id] = $true
}
foreach ($node in $nodes) {
    if (-not $ids.ContainsKey($node.node_id)) { throw "Missing icon plan ID: $($node.node_id)" }
}
if ($NodeId) {
    $plan = @($plan | Where-Object node_id -eq $NodeId)
    if ($plan.Count -ne 1) { throw "Unknown mastery node ID: $NodeId" }
}

Add-Type -AssemblyName System.Drawing
$source = [IO.File]::ReadAllText((Join-Path $here 'IconRenderer.cs'))
Add-Type -TypeDefinition $source -ReferencedAssemblies System.Drawing
$assetRoot = [IO.Path]::GetFullPath((Join-Path $here 'nodes'))
$commonSinIds = @($nodes | Where-Object { $_.tree_kind -eq 'sin' -and $_.owner_id -eq '*' } | Select-Object -ExpandProperty node_id)
$sinOwners = @($nodes | Where-Object { $_.tree_kind -eq 'sin' -and $_.owner_id -ne '*' } | Select-Object -ExpandProperty owner_id -Unique)
$commonClassIds = @($nodes | Where-Object { $_.tree_kind -eq 'class' -and $_.owner_id -eq '*' } | Select-Object -ExpandProperty node_id)
$classOwners = @($nodes | Where-Object { $_.tree_kind -eq 'class' -and $_.owner_id -ne '*' } | Select-Object -ExpandProperty owner_id -Unique)
foreach ($classId in $classOwners) {
    if (-not $classColors.ContainsKey($classId)) { throw "Missing class color: $classId" }
}
$generated = 0
$skipped = 0
foreach ($row in $plan) {
    $path = [IO.Path]::GetFullPath((Join-Path $repo $row.asset_path))
    if (-not $path.StartsWith($assetRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Asset path outside mastery nodes: $path"
    }
    $refreshBase = $NodeId -or $Force -or ($RecolorSins -and $row.tree -eq 'sin' -and $row.owner -ne '*') `
        -or ($RecolorClasses -and $row.tree -eq 'class' -and $row.owner -ne '*')
    if (-not $refreshBase -and [IO.File]::Exists($path)) { $skipped++ }
    else {
        [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($path)) | Out-Null
        $palette = if ($row.palette -and $classColors.ContainsKey($row.palette)) { $classColors[$row.palette] } else { $row.palette }
        [MasteryIconRenderer]::Render($row.glyph, $path, $palette)
        $generated++
    }
    if ($commonSinIds -contains $row.node_id) {
        foreach ($sin in $sinOwners) {
            $variantRoot = [IO.Path]::GetFullPath((Join-Path $assetRoot (Join-Path 'variants' $sin)))
            $variantPath = Join-Path $variantRoot ($row.node_id + '.png')
            if (-not $NodeId -and -not $Force -and -not $RecolorSins -and [IO.File]::Exists($variantPath)) { $skipped++ }
            else {
                [IO.Directory]::CreateDirectory($variantRoot) | Out-Null
                [MasteryIconRenderer]::Render($row.glyph, $variantPath, $sin)
                $generated++
            }
        }
    }
    if ($commonClassIds -contains $row.node_id) {
        foreach ($classId in $classOwners) {
            $variantRoot = [IO.Path]::GetFullPath((Join-Path $assetRoot (Join-Path 'variants/class' $classId)))
            $variantPath = Join-Path $variantRoot ($row.node_id + '.png')
            if (-not $NodeId -and -not $Force -and -not $RecolorClasses -and [IO.File]::Exists($variantPath)) { $skipped++ }
            else {
                [IO.Directory]::CreateDirectory($variantRoot) | Out-Null
                [MasteryIconRenderer]::Render($row.glyph, $variantPath, $classColors[$classId])
                $generated++
            }
        }
    }
}
Write-Output "Generated $generated mastery icon(s); kept $skipped existing icon(s)."
