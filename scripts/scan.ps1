# PowerShell script to scan 'files/' directory and generate data/files.json and js/data.js
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

$targetDir = "files"
$outJson = "data/files.json"
$outJs = "js/data.js"

if (-not (Test-Path $targetDir)) {
    Write-Host "Directory '$targetDir' does not exist. Creating it now..."
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

function Get-FolderNode {
    param (
        [string]$currentPath
    )

    $items = Get-ChildItem -LiteralPath $currentPath | Sort-Object { -not $_.PSIsContainer }, Name
    $list = New-Object System.Collections.ArrayList

    foreach ($item in $items) {
        # Skip hidden files
        if ($item.Name.StartsWith(".")) {
            continue
        }

        $relPath = ($item.FullName.Substring($projectRoot.Length + 1)).Replace("\", "/")

        if ($item.PSIsContainer) {
            $children = Get-FolderNode -currentPath $item.FullName
            $childArray = @()
            if ($children -ne $null) {
                if ($children -is [System.Collections.IEnumerable] -and -not ($children -is [string])) {
                    $childArray = @($children)
                } else {
                    $childArray = @($children)
                }
            }
            $folderNode = [ordered]@{
                type = "folder"
                name = $item.Name
                path = $relPath
                items = $childArray
                modified = $item.LastWriteTimeUtc.ToString("o")
            }
            [void]$list.Add($folderNode)
        } else {
            $ext = [System.IO.Path]::GetExtension($item.Name).TrimStart('.').ToLowerInvariant()
            $fileNode = [ordered]@{
                type = "file"
                name = $item.Name
                path = $relPath
                extension = $ext
                size = $item.Length
                modified = $item.LastWriteTimeUtc.ToString("o")
            }
            [void]$list.Add($fileNode)
        }
    }

    return $list
}

$rootItems = Get-FolderNode -currentPath (Join-Path $projectRoot $targetDir)
$rootArray = @($rootItems)

$catalog = [ordered]@{
    version = "1.0"
    updatedAt = (Get-Date).ToUniversalTime().ToString("o")
    root = $rootArray
}

# Convert to JSON with indentation
$jsonText = $catalog | ConvertTo-Json -Depth 20

# 1. Write to data/files.json
if (-not (Test-Path "data")) {
    New-Item -ItemType Directory -Path "data" -Force | Out-Null
}
[System.IO.File]::WriteAllText($outJson, $jsonText, [System.Text.Encoding]::UTF8)

# 2. Write to js/data.js (for file:// protocol fallback without CORS issues)
if (-not (Test-Path "js")) {
    New-Item -ItemType Directory -Path "js" -Force | Out-Null
}
$jsContent = @"
/**
 * Auto-generated file catalog fallback for Private Docs.
 * Generated at: $((Get-Date).ToString("yyyy-MM-dd HH:mm:ss"))
 */
window.FILE_CATALOG = $jsonText;
"@
[System.IO.File]::WriteAllText($outJs, $jsContent, [System.Text.Encoding]::UTF8)

$totalFiles = (Get-ChildItem -Path $targetDir -Recurse -File | Where-Object { -not $_.Name.StartsWith(".") }).Count
$totalFolders = (Get-ChildItem -Path $targetDir -Recurse -Directory | Where-Object { -not $_.Name.StartsWith(".") }).Count

Write-Host "Success! Scanned $totalFolders folder(s) and $totalFiles file(s)."
Write-Host "Updated: $outJson and $outJs"
